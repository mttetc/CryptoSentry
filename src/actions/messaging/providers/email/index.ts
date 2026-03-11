import type { AlertNotification } from '@/types/notifications';

// --- Pure functions ---

function formatSubject(notification: AlertNotification): string {
  switch (notification.alertType) {
    case 'price': {
      const symbol = notification.data.symbol ?? 'Unknown';
      const condition = notification.data.condition ?? 'changed';
      const price = notification.data.price === undefined ? '' : `$${notification.data.price}`;
      return `Price Alert: ${symbol} ${condition} ${price}`.trim();
    }
    case 'social': {
      const account = notification.data.account ?? 'Unknown';
      const keywords = notification.data.keywords?.join(', ') ?? '';
      return keywords
        ? `Social Alert: @${account} mentioned ${keywords}`
        : `Social Alert: @${account} triggered your alert`;
    }
    case 'whale': {
      const tokenSymbol = notification.data.token_symbol ?? 'Unknown';
      const valueUsd = notification.data.value_usd === undefined
        ? 'large amount'
        : `$${notification.data.value_usd.toLocaleString()}`;
      return `Whale Alert: ${valueUsd} ${tokenSymbol} transfer detected`;
    }
    case 'composite': {
      return `Composite Alert: Multiple signals detected`;
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatHtml(notification: AlertNotification): string {
  const subject = escapeHtml(formatSubject(notification));
  const message = escapeHtml(notification.message);

  const detailRows: string[] = [];

  if (notification.data.symbol) {
    detailRows.push(`<tr><td style="padding:4px 8px;color:#666;">Symbol</td><td style="padding:4px 8px;font-weight:600;">${escapeHtml(notification.data.symbol)}</td></tr>`);
  }
  if (notification.data.price !== undefined) {
    detailRows.push(`<tr><td style="padding:4px 8px;color:#666;">Price</td><td style="padding:4px 8px;font-weight:600;">$${notification.data.price}</td></tr>`);
  }
  if (notification.data.account) {
    detailRows.push(`<tr><td style="padding:4px 8px;color:#666;">Account</td><td style="padding:4px 8px;font-weight:600;">@${escapeHtml(notification.data.account)}</td></tr>`);
  }
  if (notification.data.tweet_url) {
    detailRows.push(`<tr><td style="padding:4px 8px;color:#666;">Tweet</td><td style="padding:4px 8px;"><a href="${escapeHtml(notification.data.tweet_url)}" style="color:#2563eb;">View Tweet</a></td></tr>`);
  }
  if (notification.data.tx_hash) {
    detailRows.push(`<tr><td style="padding:4px 8px;color:#666;">TX Hash</td><td style="padding:4px 8px;font-family:monospace;font-size:12px;">${escapeHtml(notification.data.tx_hash)}</td></tr>`);
  }
  if (notification.data.value_usd !== undefined) {
    detailRows.push(`<tr><td style="padding:4px 8px;color:#666;">Value</td><td style="padding:4px 8px;font-weight:600;">$${notification.data.value_usd.toLocaleString()}</td></tr>`);
  }
  if (notification.data.chain) {
    detailRows.push(`<tr><td style="padding:4px 8px;color:#666;">Chain</td><td style="padding:4px 8px;">${escapeHtml(notification.data.chain)}</td></tr>`);
  }

  const detailsTable = detailRows.length > 0
    ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${detailRows.join('')}</table>`
    : '';

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;">
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">${subject}</h2>
      <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.5;">${message}</p>
      ${detailsTable}
    </div>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
      Sent by CryptoSentry
    </p>
  </div>
</body>
</html>`.trim();
}

// --- I/O function ---

export async function sendEmailAlert(
  to: string,
  notification: AlertNotification
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CryptoSentry <alerts@cryptosentry.app>',
        to,
        subject: formatSubject(notification),
        html: formatHtml(notification),
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
}
