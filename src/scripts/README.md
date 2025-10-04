# CryptoSentry Scripts

This directory contains utility scripts for managing the CryptoSentry application.

## Monitoring Scripts

### Start Monitoring

Starts the social monitoring system using Apify.

```bash
npx ts-node src/scripts/start-monitoring.ts
```

### Test Complete System

Runs comprehensive tests for the entire system including Apify, Telegram, WhatsApp, and database connections.

```bash
npx ts-node src/scripts/test-complete-system.ts
```

## Environment Variables

All scripts use the `.env` file in the project root. Make sure to set up the required environment variables before running the scripts.

Required environment variables:

- `APIFY_API_TOKEN`: Your Apify API token
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `WHATSAPP_API_TOKEN`: Your WhatsApp Business API token
- `WHATSAPP_PHONE_NUMBER_ID`: Your WhatsApp phone number ID
