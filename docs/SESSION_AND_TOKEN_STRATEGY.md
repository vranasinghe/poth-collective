# Session and Token Strategy

Status after Phase 1. Describes what the code does today, why, and the residual risks. Everything marked **verified** is covered by an automated test in `backend/tests/auth.test.js` (or `deletion.test.js`); everything marked **by design** or **not changed** is a deliberate gap.

## 1. Model

Stateless **JSON Web Tokens**, signed **HS256** with `JWT_SECRET`.

| Property | Value |
|---|---|
| Payload | `{ id, iat, exp }` only. No role, name, email or other personal data. |
| Lifetime | **30 days** for normal accounts (not changed), **24 hours** for demo accounts. |
| Issued on | register, login, every profile update (the new token replaces the old one on the client), demo creation. |
| Refresh tokens | None. After expiry the user logs in again. |
| Transport | `Authorization: Bearer <token>` header. No cookies are used, so there is no CSRF surface. |

## 2. What the server checks on every protected request

Implemented in `backend/middlewares/authMiddleware.js`; **verified** by tests.

1. Header present and `Bearer` scheme, otherwise `401`.
2. Signature valid, **algorithm pinned to HS256** (`alg: none` and other algorithms rejected), `exp` not passed (message "Session expired"). Wrong-secret and tampered tokens are `401`.
3. `id` is a 24-hex string (operator objects and junk are rejected before any database query).
4. The user **exists and is not deleted** (`deletedAt`), looked up in the database every time, so deleting an account kills its token immediately. A deleted account returns a clean `401`, never a `500`.
5. The token was **issued at or after the last password change** (`passwordChangedAt`). Changing the password therefore revokes every older token.
6. Demo accounts are rejected once `demoExpiresAt` has passed.

Database failures during the lookup are **not** turned into `401`; they surface as `500` so outages are not mistaken for logouts.

Authorization (who may do what) is enforced on the server per endpoint (`requireRole`, ownership checks, order party checks). Hiding a button in the app is never relied on.

## 3. Credentials

- Passwords: validated on the plaintext (9-128 characters, at least one letter and one digit) **before** hashing, with bcrypt (cost 10) via `bcryptjs`. Existing, weaker passwords are not touched and still log in; the policy applies to sign-up and password change.
- Changing a password requires the **current** password.
- Login returns the same `401 Invalid credentials` for an unknown email and a wrong password, and spends a bcrypt comparison either way so response time does not reveal which emails exist. Sign-up still reveals whether an email is taken (`409`), as most apps do; it is rate-limited.
- Nothing sensitive is logged: no passwords, tokens or email addresses (**verified** by a test that captures all console output through register, login and failed logins).

## 4. Abuse protection

| Control | Setting |
|---|---|
| Failed logins | 8 per 15 min per IP + email, and 30 per 15 min per IP; successful logins are not counted. **Verified**: the targeted account is throttled (even with the right password), other accounts are not, successes do not consume the budget. |
| Sign-ups | 10 per hour per IP (**verified**) |
| Demo accounts | 10 per hour per IP, plus the existing global cap |
| General API | 300 per 15 min per IP |
| Proxy awareness | `trust proxy` = 1 (one proxy hop). If the platform adds more hops, limits would key on the wrong address; verify when deploying. `proxy-addr` was patched to a version that fixes an IPv4-mapped-IPv6 spoofing bug. |

## 5. Where the client keeps the token

| Platform | Storage | Exposure |
|---|---|---|
| Android / iOS | `@react-native-async-storage/async-storage`, key `@poth_user` (whole user object including token) | App sandbox, **not encrypted** at rest; readable on a rooted/jailbroken device or from an unencrypted backup. |
| Web | `localStorage` (via the same AsyncStorage API) | Readable by **any script running on the site's origin**, so a cross-site-scripting bug would expose tokens. |

**Why not cookies?** The web app (Netlify) and API (Railway/Render) are different origins; `HttpOnly` cookies would need `SameSite=None`, CSRF protection and credentialed CORS, a larger change than this phase. It is a reasonable later step if the web app becomes the primary client.

**Logout** is client-side: the app deletes the stored user and goes to the login screen. There is **no server-side token revocation list** (by design for a stateless design), so a stolen token stays valid until it expires **unless** the password is changed or the account deleted.

## 6. Residual risks and recommended follow-ups

| Risk | Status | Recommendation |
|---|---|---|
| 30-day lifetime is long for a bearer token | **Not changed** (decision D-6 pending) | Shorten to about 7 days, or add a short-lived access token with a refresh token. |
| Token in `localStorage` on web | By design for now | Send a strict `Content-Security-Policy` from the web host; avoid rendering untrusted HTML; consider cookies later. |
| Token in unencrypted AsyncStorage on native | By design for now | Store the token in `expo-secure-store` (Keychain / Keystore) in the frontend phase. |
| No "log out everywhere" | Not implemented | Changing the password already revokes all tokens; a dedicated button could set `passwordChangedAt` without changing the password. |
| `JWT_SECRET` strength | Server logs a **warning** below 32 characters but still starts, so an existing deployment cannot break | Use a long random value; rotating it signs everyone out. |
| Profile updates re-issue tokens | Unchanged | Harmless, but a stolen token can mint fresh ones for its remaining life; mitigated by shorter lifetime. |
| Demo sessions are real sessions | Unchanged | Demo isolation and quotas are Phase 2. |
