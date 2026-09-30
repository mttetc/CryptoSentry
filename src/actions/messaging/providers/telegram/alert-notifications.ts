import { sendTelegramMessage, getTelegramUser } from './telegram-utils';
import type { AlertNotification } from '@/types/notifications';

// --- Pure functions ---

/** Telegram parse_mode=HTML: tweet text must be escaped or messages containing "<" fail. */
export function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

const SENTIMENT_ICON: Record<string, string> = {
  bullish: '🟢',
  bearish: '🔴',
  neutral: '⚪️',
};

export function formatTelegramMessage(notification: AlertNotification): string {
  const d = notification.data;

  if (notification.alertType === 'price') {
    return [
      `<b>Price alert</b> · ${escapeHtml(String(d.symbol ?? '').toUpperCase())}`,
      escapeHtml(notification.message),
    ].join('\n');
  }

  const lines: string[] = [];
  const typeLabel = d.tweet_type && d.tweet_type !== 'original' ? ` (${d.tweet_type})` : '';
  lines.push(`<b>@${escapeHtml(d.account ?? '')}</b>${typeLabel}`);

  if (d.content) {
    lines.push(escapeHtml(d.content.length > 500 ? `${d.content.slice(0, 497)}...` : d.content));
  }

  const details: string[] = [];
  if (d.keywords && d.keywords.length > 0) {
    details.push(`Keywords: ${escapeHtml(d.keywords.join(', '))}`);
  }
  if (d.sentiment && d.sentiment !== 'neutral') {
    details.push(`${SENTIMENT_ICON[d.sentiment] ?? ''} ${escapeHtml(d.sentiment)}`.trim());
  }
  if (d.summary) {
    details.push(`<i>${escapeHtml(d.summary)}</i>`);
  }
  if (details.length > 0) {
    lines.push('', ...details);
  }

  if (d.tweet_url) {
    lines.push('', `<a href="${escapeHtml(d.tweet_url)}">Open on X</a>`);
  }

  return lines.join('\n');
}

// --- I/O orchestrator ---

export async function sendTelegramAlert(notification: AlertNotification): Promise<boolean> {
  try {
    const telegramUser = await getTelegramUser(notification.userId);
    if (!telegramUser) {
      console.error(`Telegram not linked for user ${notification.userId}`);
      return false;
    }

    const sent = await sendTelegramMessage(
      telegramUser.telegram_chat_id,
      formatTelegramMessage(notification)
    );
    if (!sent) {
      console.error(`Failed to send Telegram alert to user ${notification.userId}`);
    }
    return sent;
  } catch (error) {
    console.error('Error sending Telegram alert:', error);
    return false;
  }
}
