'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

interface WhatsAppVoiceAlert {
  userId: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface WhatsAppUser {
  id: string;
  whatsapp_id: string;
  phone_number: string;
}

export async function sendWhatsAppVoiceAlert(alert: WhatsAppVoiceAlert): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Get user's WhatsApp ID
    const whatsappUser = await getWhatsAppUser(alert.userId);

    if (!whatsappUser) {
      return {
        success: false,
        error: 'User does not have WhatsApp linked',
      };
    }

    // Create urgent message with multiple notifications
    const urgentMessage = createUrgentMessage(alert.message, alert.priority);

    // Send multiple messages to simulate "calling" effect
    const results = await sendMultipleWhatsAppMessages(
      whatsappUser.whatsapp_id,
      urgentMessage,
      alert.priority
    );

    return {
      success: results.success,
      messageId: results.messageId,
      error: results.error,
    };
  } catch (error) {
    console.error('Error sending WhatsApp voice alert:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function createUrgentMessage(message: string, priority: string): string {
  const urgencyLevel = getUrgencyLevel(priority);

  return `${urgencyLevel}\n\n🚨 CRYPTO ALERT 🚨\n\n${message}\n\n⚠️ URGENT: Check your portfolio now!\n\n📞 This is your WhatsApp voice alert!`;
}

function getUrgencyLevel(priority: string): string {
  switch (priority) {
    case 'urgent':
      return '🚨🚨🚨🚨 URGENT ALERT 🚨🚨🚨🚨';
    case 'high':
      return '🚨🚨🚨 HIGH PRIORITY 🚨🚨🚨';
    case 'normal':
      return '🔔 ALERT 🔔';
    default:
      return '📢 NOTIFICATION 📢';
  }
}

async function sendMultipleWhatsAppMessages(
  whatsappId: string,
  message: string,
  priority: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const messageCount = getMessageCount(priority);
    let lastMessageId: string | undefined;

    // Send multiple messages to simulate "calling" effect
    for (let i = 0; i < messageCount; i++) {
      const response = await fetch(`${WHATSAPP_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: whatsappId,
          type: 'text',
          text: {
            body: i === 0 ? message : `🔔 Alert ${i + 1}/${messageCount} - ${message}`,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        return {
          success: false,
          error: error.error?.message || 'Failed to send message',
        };
      }

      const result = await response.json();
      lastMessageId = result.messages?.[0]?.id;

      // Small delay between messages
      if (i < messageCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      messageId: lastMessageId,
    };
  } catch (error) {
    console.error('Error sending multiple WhatsApp messages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function getMessageCount(priority: string): number {
  switch (priority) {
    case 'urgent':
      return 5; // Send 5 messages for urgent alerts
    case 'high':
      return 3; // Send 3 messages for high priority
    case 'normal':
      return 2; // Send 2 messages for normal
    default:
      return 1; // Send 1 message for low priority
  }
}

async function getWhatsAppUser(userId: string): Promise<WhatsAppUser | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('user_whatsapp_settings')
      .select('whatsapp_id, phone_number')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: userId,
      whatsapp_id: data.whatsapp_id,
      phone_number: data.phone_number,
    };
  } catch (error) {
    console.error('Error getting WhatsApp user:', error);
    return null;
  }
}
