import type { AlertNotification } from '@/types/notifications';

// --- Pure functions ---

const SMS_MAX_LENGTH = 160;

function truncateMessage(message: string): string {
  if (message.length <= SMS_MAX_LENGTH) {
    return message;
  }
  return `${message.slice(0, SMS_MAX_LENGTH - 3)}...`;
}

function formatSmsBody(notification: AlertNotification): string {
  switch (notification.alertType) {
    case 'price': {
      const symbol = notification.data.symbol ?? '?';
      const price = notification.data.price === undefined ? '' : `$${notification.data.price}`;
      const condition = notification.data.condition ?? '';
      return truncateMessage(`[CryptoSentry] ${symbol} ${condition} ${price}`.trim());
    }
    case 'social': {
      const account = notification.data.account ?? '';
      const keywords = notification.data.keywords?.join(', ') ?? '';
      return truncateMessage(`[CryptoSentry] @${account} mentioned: ${keywords}`);
    }
    case 'whale': {
      const token = notification.data.token_symbol ?? '?';
      const value = notification.data.value_usd === undefined
        ? 'large'
        : `$${notification.data.value_usd.toLocaleString()}`;
      return truncateMessage(`[CryptoSentry] Whale: ${value} ${token} transfer on ${notification.data.chain ?? 'unknown'}`);
    }
    case 'composite': {
      return truncateMessage(`[CryptoSentry] ${notification.message}`);
    }
  }
}

// --- I/O function ---

export async function sendSmsAlert(
  phone: string,
  notification: AlertNotification
): Promise<boolean> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) {
    console.warn('[SMS] TELNYX_API_KEY not configured');
    return false;
  }

  const fromNumber = process.env.TELNYX_FROM_NUMBER;
  if (!fromNumber) {
    console.warn('[SMS] TELNYX_FROM_NUMBER not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromNumber,
        to: phone,
        text: formatSmsBody(notification),
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[SMS] Failed to send:', error);
    return false;
  }
}
