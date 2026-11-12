# Baruch IoT Platform — API Guide

**Safe to share.** This folder (`docs/api/`) is written for app developers. It has no passwords, no AWS account details, and no deploy instructions. Share this folder only — do not share `docs/internal/`.

It covers everything you need to call the API; nothing here depends on knowing how the backend is built.

| Document | What it covers |
|----------|----------------|
| This page | Base URL, authentication, request and response conventions, error format |
| [auth.md](./auth.md) | Create an account, confirm it, sign in, refresh the session |
| [products.md](./products.md) | Factory records for BMS units built by Baruch (serial numbers and metadata) |
| [bms.md](./bms.md) | Register a BMS by MAC address, receive its keys, look it up, read its history |

---

## Base URL

```text
https://v8yde6qhhh.execute-api.eu-west-2.amazonaws.com
```

This is the current development environment. The URL will change for production; keep it in a config value, not hard-coded across the app. All examples below write it as `$BASE`.

There is no API key. Public routes (`/auth/*`) need nothing. Every other route needs a signed-in user's token.

---

## Authentication in four steps

1. **Register** once with `POST /auth/register` (email, password, name). A 6-digit code is emailed.
2. **Confirm** once with `POST /auth/confirm` (email, code).
3. **Sign in** with `POST /auth/login`. The response contains `tokens.idToken`, `tokens.refreshToken`, and `user.id`. Store all three securely (Keychain on iOS, EncryptedSharedPreferences or Keystore on Android, never `localStorage` for the refresh token on web if you can avoid it).
4. **Call protected routes** with the header:

   ```text
   Authorization: Bearer <idToken>
   ```

The ID token is valid for **1 hour** (`tokens.expiresIn` is the lifetime in seconds). When it expires, every protected route returns `401 {"message":"Unauthorized"}`. Call `POST /auth/refresh` with `user.id` and the refresh token to get a new ID token without asking for the password again. The refresh token lasts 30 days; after that, or if it is rejected, send the user back to sign in.

Details and examples: [auth.md](./auth.md).

---

## Roles

Each user has one role, returned as `user.role` at sign-in:

| Role | Can |
|------|-----|
| `Operator` | Read products, devices, and their history |
| `Administrator` | Everything an Operator can, plus create products, register devices, rotate activation keys, and read the per-user audit trail |

New accounts are Operators. Administrator is granted by the Baruch team, not through the API. Calling an Administrator-only route as an Operator returns `403`. Use `user.role` to hide those actions in the UI, but always handle the `403` too.

---

## Conventions

- **JSON everywhere.** Send `Content-Type: application/json` on every `POST`. Responses are JSON with `content-type: application/json`.
- **Request bodies are limited to 8 KB.**
- **Timestamps** are ISO 8601 in UTC, e.g. `2026-11-12T14:30:00Z`. Some include milliseconds.
- **Identifiers**
  - Serial number: `BMS-2026-000001` (a unit built by Baruch). Case-insensitive on input, always upper-case in responses.
  - Device id: `dev_` followed by 26 upper-case letters and digits, e.g. `dev_01JCMK3Q7X8R2N5VBHT9AZW4E6`. Case-sensitive. Treat it as an opaque string.
  - MAC address: accepted in any common format (`AA:BB:CC:DD:EE:FF`, `aa-bb-cc-dd-ee-ff`, `aabb.ccdd.eeff`, `AABBCCDDEEFF`); always returned as `AA:BB:CC:DD:EE:FF`.
- **Lists** return `{ "items": [...], "count": n }`. Pass `?limit=` to change the page size (each route lists its default and maximum). There is no cursor pagination yet; results are capped at the maximum.
- **Rate limit:** 10 requests per second per API, with bursts of 20. Beyond that you receive `429`.
- **CORS** is open for development. Browsers can call the API from any origin.

---

## Error format

Every error is JSON with a single `message` field written for display to the user:

```json
{ "message": "Invalid email or password." }
```

| Status | Meaning | What the app should do |
|--------|---------|------------------------|
| `400` | The request was malformed or failed validation | Show `message` next to the relevant field |
| `401` | Not signed in, or the token is missing, expired, or invalid | Try `POST /auth/refresh`; if that fails, show the sign-in screen |
| `403` | Signed in, but not allowed | Show `message`; usually means an Operator tried an Administrator action |
| `404` | Nothing matches the id or filter | Show `message` |
| `409` | Conflicts with existing data (duplicate email, MAC, or serial) | Show `message` |
| `429` | Too many requests | Wait and retry with back-off |
| `500` / `502` / `507` | Server-side problem | Show a generic error and allow retry |

Two `401` cases look slightly different: when the token itself is rejected, the gateway answers `{"message":"Unauthorized"}`; when the credentials are wrong, the auth routes answer with a specific message such as `Invalid email or password.`. Treat both as "not authenticated".

---

## Secrets returned once

`POST /devices` and `POST /devices/{deviceId}/activation-key` return secrets (`instantReadingKey`, `activationKey`) **only in that response**. They cannot be fetched again. If your app displays them, give the user a way to copy them before leaving the screen. See [bms.md](./bms.md).

---

## Quick test with curl

```bash
BASE=https://v8yde6qhhh.execute-api.eu-west-2.amazonaws.com

# Sign in
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"operator@example.com","password":"<password>"}'

# Use the idToken from the response
curl -s "$BASE/products?status=MANUFACTURED" \
  -H "Authorization: Bearer <idToken>"
```

On Windows PowerShell, use `curl.exe` and single quotes exactly as above, or use `Invoke-RestMethod`.

---

## What is not available yet

- Password reset and change-password endpoints
- Sign-out / token revocation (discard the tokens on the client)
- Device telemetry (live readings) and device claiming by end users
- Cursor-based pagination

Ask the Baruch team if you need any of these prioritised.
