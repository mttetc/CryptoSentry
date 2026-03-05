'use server';

// Telegram utilities

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error answering callback query:', error);
    return false;
  }
}

export async function extractUserFromTelegramMessage(
  message: any
): Promise<{ userId: string } | null> {
  try {
    if (!message.from) {
      return null;
    }

    return {
      userId: message.from.id.toString(),
    };
  } catch (error) {
    console.error('Error extracting user from Telegram message:', error);
    return null;
  }
}

export async function verifyWebhookSignature(
  _payload: string,
  _signature: string,
  _timestamp: string
): Promise<boolean> {
  // For now, we'll skip signature verification in development
  // In production, you should implement proper webhook signature verification
  return true;
}
