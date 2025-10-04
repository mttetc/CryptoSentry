# CryptoSentry - Complete Setup Guide

## 🎉 System Overview

Your CryptoSentry system is now complete with:

- ✅ **Apify Integration** for reliable Twitter monitoring
- ✅ **Telegram Voice Alerts** for instant notifications
- ✅ **WhatsApp Voice Alerts** for instant notifications
- ✅ **SSE Streaming** for real-time updates
- ✅ **Unified Notification System** for both services
- ✅ **Pricing Tiers** with voice alerts included
- ✅ **Complete Setup Flow** for users

## 🚀 Quick Start

### 1. Environment Variables

Create a `.env.local` file with:

```bash
# Database
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_database_url

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Apify (Required for Twitter monitoring)
APIFY_API_TOKEN=your_apify_api_token

# Telegram (Required for voice alerts)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_telegram_bot_username

# WhatsApp (Required for voice alerts)
WHATSAPP_API_TOKEN=your_whatsapp_api_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id

# Optional: ElevenLabs for voice synthesis
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# Stripe (for payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# App Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Features
NEXT_PUBLIC_APP_MODE=production
NEXT_PUBLIC_WAITLIST_MODE=false
```

### 2. Database Setup

Run the migrations:

```bash
npx supabase migration up
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Test the System

```bash
npx ts-node src/scripts/test-complete-system.ts
```

## 📱 Service Setup

### Telegram Bot Setup

1. **Create Bot**: Message @BotFather on Telegram
2. **Get Token**: Save the bot token
3. **Set Username**: Set a username for your bot
4. **Add to .env**: Add token and username to environment

### WhatsApp Business Setup

1. **Create Meta App**: Go to Meta for Developers
2. **Add WhatsApp Product**: Enable WhatsApp Business API
3. **Get Credentials**: Save API token and phone number ID
4. **Add to .env**: Add credentials to environment

### Apify Setup

1. **Create Account**: Sign up at apify.com
2. **Get API Token**: From your dashboard
3. **Choose Plan**: Start with Scale plan ($199/month)
4. **Add to .env**: Add API token to environment

## 🎯 User Flow

### 1. User Registration

- User signs up
- Redirected to `/setup` page

### 2. Service Connection

- User chooses Telegram and/or WhatsApp
- Follows setup instructions
- Services are connected and verified

### 3. Alert Creation

- User creates social alerts (account + keywords)
- User creates price alerts (symbol + target)
- Alerts are stored in database

### 4. Monitoring

- Apify monitors Twitter accounts
- Detects keyword matches
- Sends unified alerts (Telegram + WhatsApp)
- User receives instant voice notifications

## 💰 Pricing Structure

### Starter - $19/month

- 2 Twitter accounts
- 5 keywords
- Telegram + WhatsApp voice alerts
- Email alerts

### Pro - $39/month

- 5 Twitter accounts
- 15 keywords
- All voice alerts + SMS
- Email alerts

### Enterprise - $79/month

- 15 Twitter accounts
- Unlimited keywords
- All alerts + priority support

## 🔧 Technical Architecture

### Monitoring Flow

1. **Apify Client** scrapes Twitter accounts
2. **Social Monitor** processes tweets
3. **Keyword Matching** detects alerts
4. **Unified Notifications** sends to both services
5. **SSE Streaming** updates dashboard

### Cost Optimization

- **Batch Processing**: Multiple accounts in one request
- **Caching**: 5-minute cache to avoid duplicates
- **Smart Monitoring**: Only active accounts
- **Rate Limiting**: Respects API limits

## 📊 Monitoring & Analytics

### Dashboard Features

- **Service Status**: Shows connected services
- **Alert History**: All triggered alerts
- **Real-time Updates**: SSE streaming
- **Performance Metrics**: Success rates

### API Endpoints

- `POST /api/monitoring/start` - Start monitoring
- `POST /api/monitoring/stop` - Stop monitoring
- `GET /api/monitoring/start` - Get status
- `POST /api/telegram/send-verification` - Send Telegram code
- `POST /api/telegram/verify` - Verify Telegram
- `POST /api/whatsapp/generate-qr` - Generate WhatsApp QR
- `POST /api/whatsapp/verify-connection` - Verify WhatsApp

## 🚨 Troubleshooting

### Common Issues

1. **Apify API Errors**

   - Check API token
   - Verify account credits
   - Check rate limits

2. **Telegram Not Working**

   - Verify bot token
   - Check bot username
   - Ensure user added bot

3. **WhatsApp Not Working**

   - Verify API credentials
   - Check phone number ID
   - Ensure webhook setup

4. **Database Errors**
   - Check Supabase connection
   - Verify RLS policies
   - Check migration status

### Debug Commands

```bash
# Test complete system
npx ts-node src/scripts/test-complete-system.ts

# Test Apify only
npx ts-node src/scripts/test-monitoring.ts

# Check environment
node -e "console.log(process.env.APIFY_API_TOKEN ? '✅ Apify' : '❌ Apify')"
```

## 🎉 You're Ready!

Your CryptoSentry system is now complete with:

- ✅ Reliable Twitter monitoring via Apify
- ✅ Instant voice alerts via Telegram & WhatsApp
- ✅ Real-time SSE streaming
- ✅ Complete user setup flow
- ✅ Pricing tiers with voice alerts
- ✅ Unified notification system

**Next Steps:**

1. Set up your environment variables
2. Run the database migrations
3. Test the complete system
4. Deploy to production
5. Start acquiring users!

**Happy monitoring! 🚀**
