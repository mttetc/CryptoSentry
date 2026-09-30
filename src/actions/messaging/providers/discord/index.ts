import type { AlertNotification } from '@/types/notifications';

// --- Pure functions ---

// Decimal color values for Discord embeds
const EMBED_COLOR_GREEN = 2_278_750; // #22C55E
const EMBED_COLOR_RED = 15_680_580; // #EF4444
const EMBED_COLOR_BLUE = 3_901_174; // #3B82F6

function resolveEmbedColor(notification: AlertNotification): number {
  const condition = notification.data.condition?.toLowerCase() ?? '';

  if (condition.includes('above') || condition.includes('bullish')) {
    return EMBED_COLOR_GREEN;
  }
  if (condition.includes('below') || condition.includes('bearish')) {
    return EMBED_COLOR_RED;
  }

  return EMBED_COLOR_BLUE;
}

function formatAlertTitle(notification: AlertNotification): string {
  switch (notification.alertType) {
    case 'price': {
      return 'Price Alert';
    }
    case 'social': {
      return 'Social Alert';
    }
  }
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline: boolean;
}

function buildEmbedFields(notification: AlertNotification): DiscordEmbedField[] {
  const fields: DiscordEmbedField[] = [];

  if (notification.data.symbol) {
    fields.push({ name: 'Symbol', value: notification.data.symbol, inline: true });
  }
  if (notification.data.price !== undefined) {
    fields.push({ name: 'Price', value: `$${notification.data.price}`, inline: true });
  }
  if (notification.data.condition) {
    fields.push({ name: 'Condition', value: notification.data.condition, inline: true });
  }
  if (notification.data.account) {
    fields.push({ name: 'Account', value: `@${notification.data.account}`, inline: true });
  }
  if (notification.data.keywords && notification.data.keywords.length > 0) {
    fields.push({ name: 'Keywords', value: notification.data.keywords.join(', '), inline: true });
  }
  if (notification.data.tweet_url) {
    fields.push({ name: 'Tweet', value: `[View](${notification.data.tweet_url})`, inline: false });
  }

  return fields;
}

function buildDiscordPayload(notification: AlertNotification): Record<string, unknown> {
  return {
    embeds: [
      {
        title: formatAlertTitle(notification),
        description: notification.message,
        color: resolveEmbedColor(notification),
        fields: buildEmbedFields(notification),
        timestamp: new Date().toISOString(),
        footer: {
          text: 'CryptoSentry',
        },
      },
    ],
  };
}

// --- I/O function ---

export async function sendDiscordAlert(
  webhookUrl: string,
  notification: AlertNotification
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildDiscordPayload(notification)),
    });

    // Discord returns 204 No Content on success
    return response.ok;
  } catch (error) {
    console.error('[Discord] Failed to send:', error);
    return false;
  }
}
