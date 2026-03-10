import type { AlertNotification } from '@/types/notifications';

// --- Pure functions ---

// Decimal color values for Discord embeds
const EMBED_COLOR_GREEN = 0x22_C5_5E;
const EMBED_COLOR_RED = 0xEF_44_44;
const EMBED_COLOR_BLUE = 0x3B_82_F6;
const EMBED_COLOR_PURPLE = 0xA8_55_F7;

function resolveEmbedColor(notification: AlertNotification): number {
  if (notification.alertType === 'whale') {
    return EMBED_COLOR_PURPLE;
  }

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
    case 'whale': {
      return 'Whale Alert';
    }
    case 'composite': {
      return 'Composite Alert';
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
  if (notification.data.token_symbol) {
    fields.push({ name: 'Token', value: notification.data.token_symbol, inline: true });
  }
  if (notification.data.value_usd !== undefined) {
    fields.push({ name: 'Value', value: `$${notification.data.value_usd.toLocaleString()}`, inline: true });
  }
  if (notification.data.chain) {
    fields.push({ name: 'Chain', value: notification.data.chain, inline: true });
  }
  if (notification.data.tx_hash) {
    fields.push({ name: 'TX Hash', value: `\`${notification.data.tx_hash}\``, inline: false });
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
