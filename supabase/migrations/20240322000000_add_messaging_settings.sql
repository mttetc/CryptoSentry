-- Create user_telegram_settings table
CREATE TABLE IF NOT EXISTS user_telegram_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_username TEXT,
  telegram_chat_id TEXT,
  verification_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create user_whatsapp_settings table
CREATE TABLE IF NOT EXISTS user_whatsapp_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  whatsapp_id TEXT,
  qr_code_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  connected_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create user_subscriptions table for pricing tiers
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pricing_tier TEXT NOT NULL DEFAULT 'starter' CHECK (pricing_tier IN ('starter', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create alert_delivery_logs table
CREATE TABLE IF NOT EXISTS alert_delivery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('price', 'social')),
  channel TEXT NOT NULL CHECK (channel IN ('telegram_voice', 'whatsapp_voice', 'sms', 'email')),
  message_id TEXT,
  data JSONB,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_recurring column to social_alerts if it doesn't exist
ALTER TABLE social_alerts 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_telegram_settings_user_id ON user_telegram_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_whatsapp_settings_user_id ON user_whatsapp_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_logs_user_id ON alert_delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_logs_created_at ON alert_delivery_logs(created_at);

-- Enable Row Level Security
ALTER TABLE user_telegram_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own telegram settings" ON user_telegram_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own telegram settings" ON user_telegram_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own telegram settings" ON user_telegram_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own whatsapp settings" ON user_whatsapp_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own whatsapp settings" ON user_whatsapp_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own whatsapp settings" ON user_whatsapp_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own delivery logs" ON alert_delivery_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert delivery logs" ON alert_delivery_logs
  FOR INSERT WITH CHECK (true);
