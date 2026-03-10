---
title: "feat: Replace Telegram ID field with QR code connect"
type: feat
status: active
date: 2026-03-10
origin: docs/brainstorms/2026-03-10-telegram-qr-connect-brainstorm.md
---

# feat: Replace Telegram ID field with QR code connect

## Overview

Replace the manual "Telegram Conversation ID" text input in the create-alert form with a single QR code on the dashboard that auto-connects a user's Telegram via deep link. The `telegram_conversation_id` field on alerts is vestigial -- the notification pipeline already uses `user_telegram_settings` (per-user). (see brainstorm: docs/brainstorms/2026-03-10-telegram-qr-connect-brainstorm.md)

## Problem Statement

- Users must manually find and paste a Telegram chat ID -- confusing and error-prone
- The `telegramConversationId` form field is never used by the notification system
- The existing webhook already supports `/start connect_<userId>` deep links but no UI exposes it

## Proposed Solution

1. **Secure deep link**: Generate a signed, time-limited token for the `t.me` deep link (prevents impersonation)
2. **QR code component**: Dashboard shows a QR code when Telegram is not connected, "Connected" status when it is
3. **Remove vestigial field**: Strip `telegramConversationId` from form, schemas, actions, types, queries
4. **Polling for status**: QR component polls connection status every 3s while displayed

## Technical Approach

### Phase 1: Secure Connect Token

**Why:** The raw `userId` in a deep link is a security risk -- anyone who sees the QR code can hijack the connection. Generate an HMAC-signed token with expiry.

**New file:** `src/lib/telegram-connect-token.ts`

```typescript
// Server-only utility
import { createHmac } from 'crypto';

const SECRET = process.env.TELEGRAM_CONNECT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export function generateConnectToken(userId: string): string {
  const timestamp = Date.now().toString(36);
  const payload = `${userId}.${timestamp}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 12);
  return `${payload}.${sig}`;
}

export function verifyConnectToken(token: string): { userId: string; valid: boolean } {
  const [userId, timestamp, sig] = token.split('.');
  if (!userId || !timestamp || !sig) return { userId: '', valid: false };

  const payload = `${userId}.${timestamp}`;
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 12);
  if (sig !== expected) return { userId: '', valid: false };

  const tokenTime = parseInt(timestamp, 36);
  if (Date.now() - tokenTime > EXPIRY_MS) return { userId, valid: false };

  return { userId, valid: true };
}
```

**Modify:** `src/app/api/webhooks/telegram/route.ts`
- Update `parseConnectUserId()` to parse the signed token instead of raw userId
- Call `verifyConnectToken()` and reject expired/invalid tokens
- Send error message to Telegram user if token is invalid

**New server action:** `src/actions/telegram/get-connect-link.ts`

```typescript
'use server';
import { requireAuth } from '@/lib/api/auth';
import { generateConnectToken } from '@/lib/telegram-connect-token';

export async function getTelegramConnectLink(): Promise<string> {
  const { userId } = await requireAuth();
  const token = generateConnectToken(userId);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'CryptoSentryBot';
  return `https://t.me/${botUsername}?start=${token}`;
}
```

### Phase 2: QR Code Component

**Install:** `qrcode.react`

```bash
pnpm add qrcode.react
```

**New file:** `src/components/telegram/telegram-qr-connect.tsx`

Three states: `loading` | `disconnected` (QR code) | `connected` (status chip + disconnect)

```typescript
'use client';
// Uses getTelegramConnectLink server action for the deep link
// Uses checkTelegramStatus server action for polling
// Polls every 3s while QR is displayed, stops when connected
// Shows QR code via qrcode.react <QRCodeSVG>
// Connected state: green chip with "Telegram connected" + Disconnect button
// Disconnect calls a server action that sets status='disconnected'
```

**New server action:** `src/actions/telegram/check-status.ts`

```typescript
'use server';
import { requireAuth } from '@/lib/api/auth';
// Query user_telegram_settings for current user, return status
export async function checkTelegramStatus(): Promise<'connected' | 'disconnected' | 'none'> { ... }
```

**New server action:** `src/actions/telegram/disconnect.ts`

```typescript
'use server';
import { requireAuth } from '@/lib/api/auth';
// Set user_telegram_settings.status = 'disconnected' for current user
export async function disconnectTelegram(): Promise<void> { ... }
```

### Phase 3: Dashboard Integration

**Modify:** `src/app/dashboard/page.tsx`
- Import `TelegramQrConnect`
- Place it between `DashboardTitleRow` and the alerts `Suspense` boundary (around line 89-91)
- Pass `userId` from session

### Phase 4: Remove Vestigial Field

**Files to modify (all remove `telegramConversationId` / `telegram_conversation_id`):**

| File | Change |
|------|--------|
| `src/components/dashboard/create-alert-form.tsx:23,48,181-203` | Remove from schema, defaults, and Controller block |
| `src/actions/alerts/schemas/index.ts:11,19` | Remove from `socialAlertSchema` and `updateSocialAlertSchema` |
| `src/actions/alerts/lib/core.ts:17,34-36` | Remove from `buildSocialAlertRow()` and `buildUpdateData()` |
| `src/actions/alerts/lib/queries.ts:49` | Remove from query mapping |
| `src/types/alerts.ts:43` | Remove from `SocialAlertWithStats` |
| `src/components/dashboard/active-conversations.tsx:165-173` | Replace per-alert badge with user-level status (pass `isTelegramConnected` prop from dashboard) |

**DB column:** Leave `social_alerts.telegram_conversation_id` in the database (nullable, unused). Cleanup migration later.

## Acceptance Criteria

- [ ] QR code displayed on dashboard when Telegram is not connected
- [ ] Scanning QR code opens Telegram with bot deep link
- [ ] Tapping "Start" in Telegram auto-connects (webhook handles signed token)
- [ ] Dashboard updates to "Connected" status within ~3s of connection (polling)
- [ ] "Disconnect" button sets status to disconnected, QR reappears
- [ ] Deep link token expires after 10 minutes (security)
- [ ] Invalid/expired tokens rejected by webhook with user-friendly Telegram message
- [ ] `telegramConversationId` field fully removed from create-alert form
- [ ] All downstream references (schemas, actions, types, queries) cleaned up
- [ ] Alert cards show Telegram badge based on user-level status, not per-alert field
- [ ] Works on mobile (deep link opens Telegram app) and desktop (opens Telegram web/app)

## Out of Scope (flagged for later)

- **`/setup` page cleanup**: The `TelegramSetup` component at `src/components/telegram/telegram-setup.tsx` uses non-existent API routes. Should be removed/redirected separately.
- **`call_enabled` toggle audit**: The toggle is rendered but the notification pipeline does not check it. Separate issue.
- **DB migration**: Dropping `telegram_conversation_id` column from `social_alerts` table.
- **Supabase Realtime**: Could replace polling for status updates. Polling is simpler for now.

## Dependencies & Risks

- **`TELEGRAM_CONNECT_SECRET` env var**: Needs to be set in production. Can fall back to `SUPABASE_SERVICE_ROLE_KEY` for simplicity.
- **`NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` env var**: Not currently set. Falls back to `CryptoSentryBot`.
- **`qrcode.react` package**: New dependency, well-maintained (10M+ weekly downloads).
- **Bot blocked by user**: If user previously blocked the bot, the deep link may not work. No mitigation possible from our side -- show help text.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-10-telegram-qr-connect-brainstorm.md](docs/brainstorms/2026-03-10-telegram-qr-connect-brainstorm.md) -- Key decisions: one QR per user (not per alert), deep link with userId, dashboard placement
- Existing webhook handler: `src/app/api/webhooks/telegram/route.ts:12-56`
- Notification gate: `src/actions/messaging/unified-notifications.ts:39-49`
- User settings table: `supabase/migrations/20241201000000_phase2_simplified_schema.sql:7-16`
