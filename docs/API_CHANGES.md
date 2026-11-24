# API Changes — Phase 1

Applies to the `backend/` on branch `phase-1/backend-integrity`, relative to the pre-Phase-1 working tree (itself already stricter than committed `main`; differences from committed `main` are marked **[vs main]**). Every row below is exercised by an automated test in `backend/tests/` unless noted.

## 1. Summary for client developers

| Area | Change | Does the current app break? |
|---|---|---|
| Error format | Always `{ "message": "..." }`; validation errors add `"errors": [{ "field", "message" }]`. 500s are always `{ "message": "Internal server error" }`. | No: the app already reads `error.response.data.message`. |
| Status codes | 401 = not signed in / bad token, 403 = signed in but not allowed (was 401 for several), 404 = not found, 409 = conflict (stock shortage, illegal status change, already reviewed...), 400 = invalid input. | No: the app does not branch on codes. |
| Orders | Server derives reader, shop, price and status. Legal status transitions only. Cancelling returns stock exactly once. Orders are never deleted. | No. `reader`, `shop` and `totalPrice` are still accepted in the request and ignored. |
| Order `DELETE` | Now **cancels** Pending orders (and Confirmed ones when the shop does it) and the order stays in the list as `Cancelled`; Delivered/Cancelled orders are only hidden from the caller's list; Shipped returns 409. | UI wording still fits ("Cancel Request", "Remove"). Cancelled orders now remain visible (they already render with a Cancelled badge). |
| Blogs | Only the author can edit or delete (was: any Shop Owner too). | The blog list still **shows Edit/Delete to every Shop Owner**; for non-authors the API now answers 403. UI fix belongs to the redesign phase. |
| Shops (public) | Owner's email removed from public payloads. `followers` now contains only the *viewer's own id* when they follow the shop (plus new `followersCount`). | No: the app only checks `followers.includes(userId)` and `shopOwner._id`. |
| Reports | `GET /api/reports` returns only your own shops' reports (owner) or reports of shops you follow (customer). | No: the Alerts tab keeps working for followers; it simply no longer shows strangers' shops. |
| Validation | Phone numbers must be digits only (10), passwords 9-128 with a letter and a digit, quantities whole numbers 1-100, etc. | A phone typed with spaces/dashes is now rejected with a clear message. |
| Uploads | JPG/PNG by content, 5 MB, 1 file, expected field names only. `image/jpg` (what React Native sends) is accepted. | No. |
| Delete behaviour | Books/shops with history are archived instead of deleted; user deletion anonymises the account. | The UI still receives `200` and `{message}`. Shop deletion may now return **409** with an explanatory message when orders are open. |

No endpoint was removed or renamed. Two response codes changed on success: `POST /api/users/register` now returns **201** (was 200); the body is unchanged.

## 2. Cross-cutting

- **Authentication:** `Authorization: Bearer <jwt>`. Tokens are checked for signature (HS256 only), expiry, the account's existence and deletion state, password-change revocation and demo expiry. See `SESSION_AND_TOKEN_STRATEGY.md`.
- **Validation:** every body, parameter and multipart form is validated with an allow-list schema (zod). Unknown fields are dropped, never stored. Malformed ids are `400`.
- **Rate limits** (per client IP; configurable in `app.js`): general API 300 / 15 min; **failed** logins 8 / 15 min per IP+email and 30 / 15 min per IP; sign-ups 10 / hour; demo accounts 10 / hour. Exceeding returns **429** with a message. Successful logins do not count.
- **CORS:** browsers may call the API from the built-in production origins, `CORS_ORIGINS` and (outside production) localhost. Anything else gets **403** `Not allowed by CORS` and no CORS headers. `*` is ignored. Requests without an `Origin` header (native app, curl) are not affected.
- **Security headers:** `helmet` defaults; `X-Powered-By` removed. `/health` unchanged.
- **Logging:** no request bodies, credentials, tokens or email addresses are logged. Server faults log `method`, path (no query string), error name and message; stacks only outside production.

## 3. Endpoint-by-endpoint

### Users `/api/users`
| Endpoint | Change |
|---|---|
| `POST /register` | Password policy enforced on the plaintext (9-128 chars, letter + digit); email trimmed and lower-cased; phone 10 digits; `userType` must be `Customer` or `Shop Owner`; extra fields (e.g. `isDemo`) ignored; duplicate email `409`; success `201`. **[vs main]** weak passwords and arbitrary `userType` strings were accepted. |
| `POST /login` | Constant-time style comparison for unknown emails; deleted accounts cannot log in; response now also carries `nearestCity`, `phoneNumber` (and `isDemo`/`demoExpiresAt` for demo accounts). Operator-injection bodies are `400`. **[vs main]** logged emails and password-match results. |
| `PUT /profile` | Allow-list `firstName`, `lastName`, `email`, `password`. Changing the password requires `currentPassword` (`400` if missing, `403` if wrong) and revokes older tokens; a new token is returned. Duplicate email `409`. Role and demo fields cannot be changed. |
| `DELETE /profile` | Anonymises the account and cleans its content (see `DATA_LIFECYCLE.md`). `409` while the user has an order in transit or their shop has open orders. The old token is dead immediately. |
| `POST /demo` | Unchanged behaviour (still real login through the same token path); now validated. |

### Shops `/api/shops`
| Endpoint | Change |
|---|---|
| `GET /`, `GET /:id` | Archived shops are hidden (`404`). Owner email removed; `followers` masked as above; `followersCount` added. Optional `Authorization` is honoured (an invalid token is ignored, not an error). |
| `POST /` | **Shop Owner only** (`403` for customers). Allow-listed fields only. |
| `PUT /:id` | Owner of the shop only (`403` otherwise, was `401`). Only `name`, `description`, `contactNumber`, image. `location` stays immutable; owner, ratings and followers cannot be set. |
| `DELETE /:id` | Owner only. `409` while orders are open; otherwise archives (or removes outright if it never had an order). |
| `POST /:id/follow` | Atomic; `400` when an owner follows their own shop. |

### Books `/api/books`
| Endpoint | Change |
|---|---|
| `GET /`, `GET /:id`, `GET /shop/:shopId`, `GET /owner/me` | Archived books hidden. |
| `POST /` | **Shop Owner who owns the target shop** (`403` otherwise, `404` unknown shop). Price/stock validated; ratings start at 0. **[vs main]** any user could add a book to any shop. |
| `PUT /:id` | Owner only (`403`, was `401`). Allow-list: `title`, `author`, `description`, `category`, `price`, `stockCount`, image. `shop`, ratings, counts, `archivedAt`, `imageUrl` are ignored. Validators run (negative price/stock `400`). |
| `DELETE /:id` | Owner only. Archived when it appears in any order; removed (with its reviews) otherwise. Open orders for an archived book can still be fulfilled or cancelled. |

### Orders `/api/orders` (all require a token)
| Endpoint | Change |
|---|---|
| `POST /` | Validated; `quantity` whole number 1-100; `book` must exist and be available, optional `shop` must match the book's shop (`400`), owners cannot order their own shop's books (`403`). Price = server price x quantity (rounded to 2 dp). Stock reserved atomically (and in a transaction on replica sets): shortage `409`, never negative. Payment slip required and stored only after validation. **[vs main]** unauthenticated; client chose reader, shop and price. |
| `GET /reader/:readerId` | Caller only (`403` for any other id). Hides orders the customer removed from their list; newest first. |
| `GET /shop/:shopId` | That shop's owner only (`403` otherwise, `404` unknown shop). |
| `PUT /:id/status` | That shop's owner only. Legal transitions: Pending to Confirmed or Cancelled; Confirmed to Shipped or Cancelled; Shipped to Delivered. Anything else `409`. Concurrent changes: one wins, others `409`. Cancelling returns the stock once. |
| `PUT /:id/delivery` | The customer only, only while Pending (`409` after). Validated; race-safe against the shop confirming. |
| `DELETE /:id` | See section 1 (cancel / hide / `409` when Shipped). Customers cannot cancel after the shop confirmed. |

### Reviews `/api/reviews`
| Endpoint | Change |
|---|---|
| `POST /` | Target must exist, be active and match `targetModel` (`404`). Owners cannot review their own shop **or books** (`403`). One per user per target (`409`, race-safe via a unique index). Rating a whole number 1-5 (`400`). Ratings recomputed from the stored reviews. |
| `PUT /:id`, `DELETE /:id` | Author only (`403`, was `401`). Only `rating` and `comment` are editable. |
| `GET /:targetId` | Malformed id `400`. |

### Blogs `/api/blogs`
| Endpoint | Change |
|---|---|
| `PUT /:id`, `DELETE /:id` | **Author only** (`403` otherwise). Likes, comments, author and dates cannot be set. |
| `POST /:id/like` | Atomic toggle. |
| `POST /:id/comments` | Text 1-1000 chars; at most 500 comments per post (`409` beyond). |

### Reports `/api/reports`
| Endpoint | Change |
|---|---|
| `GET /preview/:shopId`, `POST /:shopId` | Shop Owner who owns the shop only (`403`). Archived books excluded from the breakdown. |
| `GET /` | Scoped as in section 1. **[vs main]** returned every shop's reports to any signed-in user. |

## 4. Configuration, dependencies and deployment

- **No new required environment variables.** Optional: `CORS_ORIGINS`, `DEMO_ENABLED`. `UPLOAD_DRIVER=stub` exists for tests only and the server **refuses to start with it in production**.
- **Entry point unchanged:** `node server.js` (Dockerfile `CMD`, Render health check `/health`). `app.js` is a new side-effect-free module the tests import.
- **Dependencies:** added `zod`; upgraded `multer` 1.x to 2.x (security fixes); removed `multer-storage-cloudinary` (uploads now go through `cloudinary.uploader.upload_stream` after validation); `mongoose`, `body-parser`, `proxy-addr`, `qs`, `express` patched within their majors. Dev-only: `jest`, `supertest`, `mongodb-memory-server`.
- **Docker:** `npm ci --omit=dev` so no test tooling or database binary enters the production image; tests excluded by `.dockerignore`.
- **Database:** no destructive migration. New optional fields (`archivedAt`, `deletedAt`, `passwordChangedAt`, `readerArchived`, `shopArchived`) default safely for existing documents. See `DATA_LIFECYCLE.md` for the unique review index and rollback.

## 5. Intentionally unchanged in Phase 1 (listed so nothing is assumed)

JWT lifetime (30 days); list endpoints are not paginated; payment slips are still public Cloudinary assets; demo-account isolation and quotas (Phase 2); frontend behaviour and design (Phase 3+); `dns.setServers` override in `server.js`.
