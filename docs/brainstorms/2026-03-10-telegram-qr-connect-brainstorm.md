# Brainstorm: Replace Telegram ID Field with QR Code Connect

**Date:** 2026-03-10
**Status:** Approved

## What We're Building

Replace the manual "Telegram Conversation ID" text field in the create-alert form with a QR code in the dashboard that automatically connects a user's Telegram account via deep link.

## Why This Approach

- The `telegram_conversation_id` field on individual alerts is **vestigial** -- the notification system already uses `user_telegram_settings` (per-user, not per-alert)
- Manual chat ID entry is confusing and error-prone for users
- Deep link `t.me/Bot?start=connect_<userId>` already works via the existing webhook handler
- One QR per user (not per alert) matches the existing architecture

## Key Decisions

1. **Deep link with userId**: `t.me/<BotUsername>?start=connect_<userId>` -- webhook already handles `/start connect_<userId>` and stores chat_id in `user_telegram_settings`
2. **One QR per user**: Notifications are per-user, not per-alert. All alerts go to the same Telegram chat.
3. **Location**: Dashboard section "Connect Telegram" -- always visible, not buried in alert creation
4. **Remove vestigial field**: Drop `telegramConversationId` from form, schema, actions, and types. Keep DB column (nullable, unused) -- cleanup migration later.
5. **Mobile-ready**: `t.me/` deep links open the Telegram app directly on mobile (App Store ready)

## Scope

### Remove
- `telegramConversationId` from create-alert form, schemas, server actions, types, queries
- Telegram badge in active-conversations that checks `telegram_conversation_id`

### Add
- QR code component using `qrcode.react` library
- "Connect Telegram" section in dashboard with QR code + status indicator
- Use `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` env var (fallback: `CryptoSentryBot`)

### Keep As-Is
- Webhook handler (`/api/webhooks/telegram/route.ts`) -- already works
- `user_telegram_settings` table -- already the source of truth
- Notification pipeline -- already uses `user_telegram_settings`
- DB column `telegram_conversation_id` on `social_alerts` -- drop later
