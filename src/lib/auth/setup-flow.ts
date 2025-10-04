'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function checkUserSetupStatus(userId: string): Promise<{
  needsSetup: boolean;
  hasTelegram: boolean;
  hasWhatsApp: boolean;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user has any messaging services connected
    const [telegramResult, whatsappResult] = await Promise.all([
      supabase
        .from('user_telegram_settings')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'connected')
        .single(),
      supabase
        .from('user_whatsapp_settings')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'connected')
        .single(),
    ]);

    const hasTelegram = telegramResult.data?.status === 'connected';
    const hasWhatsApp = whatsappResult.data?.status === 'connected';
    const needsSetup = !hasTelegram && !hasWhatsApp;

    return {
      needsSetup,
      hasTelegram,
      hasWhatsApp,
    };
  } catch (error) {
    console.error('Error checking user setup status:', error);
    // If there's an error, assume setup is needed
    return {
      needsSetup: true,
      hasTelegram: false,
      hasWhatsApp: false,
    };
  }
}
