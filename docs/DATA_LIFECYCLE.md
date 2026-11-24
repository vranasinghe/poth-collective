# Data Ownership, Deletion and Migration Policy

Status after Phase 1. Implemented in `backend/services/deletionService.js` and `backend/services/orderService.js`; verified by `backend/tests/deletion.test.js`, `books-shops.test.js` and `orders.integrity.test.js`.

## 1. Ownership

| Record | Owned by | Who may change it |
|---|---|---|
| User | the user | the user (profile, password, delete) |
| Shop | its `shopOwner` | that owner only; location is immutable |
| Book | the owner of its shop | that owner only |
| Order | **two parties**: the customer (`reader`) and the shop's owner | customer: delivery details while Pending, cancel while Pending, hide when finished. Owner: status changes, cancel Pending/Confirmed, hide when finished. Neither can edit the other's view. |
| Review | its author | author only (rating and comment) |
| Blog, comments, likes | the author / commenter | author edits and deletes the post |
| Stock report | the shop it describes | that shop's owner creates it; owner and followers read it |

## 2. Deletion policy (nothing is destroyed that someone still relies on)

| Entity | "Delete" does | Hard-deleted only when | Refused (409) when |
|---|---|---|---|
| **Order** | Never deleted. `DELETE` cancels Pending orders (Confirmed ones when the shop does it), or hides a Delivered/Cancelled order from the caller's own list (`readerArchived` / `shopArchived`). | never | Shipped (goods in transit) |
| **Book** | Archived (`archivedAt`): hidden from all catalogues, cannot be ordered or reviewed. Existing orders keep rendering it and can still be fulfilled or cancelled with stock returned. | it never appeared in any order **and** the database supports transactions (so "never ordered" is proven atomically). Its reviews go with it. | - |
| **Shop** | Archived together with its books. Orders, reports and history are retained. | it never had an order (same transaction condition). Books, reviews and reports go with it. | any order is Pending, Confirmed or Shipped |
| **User** | **Anonymised tombstone**: personal data and credentials erased (`Deleted User`, `deleted-<id>@deleted.invalid`, placeholder phone, unusable random password, `deletedAt` set). The `_id` stays so orders keep a valid reader reference. The account can never authenticate again and the email becomes reusable. | never (the tombstone is kept) | the user has a Shipped order, or their shop has open orders |
| **Review** | Removed with its author, or with a hard-deleted book/shop; ratings are recomputed from what remains. | yes | - |
| **Blog / likes / comments** | The user's blogs are deleted; their likes and comments on other people's blogs are removed. | yes | - |
| **Follows** | Removed from every shop. | yes | - |
| **Report** | Kept with an archived shop; deleted with a hard-deleted shop. | with its shop | - |

When a customer is deleted, their Pending/Confirmed orders are **cancelled and the stock returned** (exactly once) before anything else changes. All refusal checks run **before** any change, so a refused deletion leaves everything untouched. A deletion that is interrupted can simply be repeated: every step is idempotent and the tombstone is written last.

**Referential guarantee (tested):** after a mix of book, shop and user deletions, every remaining order still points at an existing user, shop and book.

## 3. Stock and orders

- Reserving stock is a conditional atomic update (`stockCount >= quantity`), so concurrent buyers can never push stock below zero (tested with 12 simultaneous buyers for 5 copies, in both modes below).
- A status change is a compare-and-swap on the current status. Of several simultaneous requests exactly one wins, and only the winner of a move to `Cancelled` returns stock, so stock can never be restored twice.
- **Deployment modes.** On a replica set (MongoDB Atlas, including the free tier) the reservation + order creation, and the status change + restock, each run in **one transaction**. On a standalone `mongod` (no transactions) the same operations run in the same order with compensation: a failed order insert returns the reserved stock. The only residual window without transactions is a process crash between two writes; with transactions there is none. The mode is detected once per connection (`services/transaction.js`). Both modes are covered by the test suite; the standalone path was also run against a real standalone `mongod`.
- Hard deletes of books/shops are only performed when transactions are available; otherwise they archive.

## 4. Schema additions and migration

All additions are **optional fields with safe defaults**, so existing documents work unchanged and **no data migration is required**.

| Collection | New field | Meaning when absent |
|---|---|---|
| `users` | `deletedAt`, `passwordChangedAt` | not deleted / no password change yet |
| `shops`, `books` | `archivedAt` | active (queries use `archivedAt: null`, which also matches documents without the field) |
| `orders` | `readerArchived`, `shopArchived` | visible (queries use `$ne: true`) |
| `users.userType` | now an enum (`Customer`, `Shop Owner`) | Mongoose validates modified paths only, so existing documents with other values are not rejected unless that field is modified |
| `books.stockCount`, `orders.quantity`, `reviews.rating` | integer validators | applied only when those fields are written |
| `users.password` | the misleading `minlength` on the hash was removed | - |

New indexes (built automatically at startup, small collections, no downtime expected): `orders{reader,createdAt}`, `orders{shop,createdAt}`, `orders{book}`, `books{shop,archivedAt}`, `shops{shopOwner,archivedAt}`, and the unique review index below.

### The one step that needs care: unique review index

`reviews{user, targetModel, targetId}` is declared **unique**. MongoDB cannot build a unique index while duplicates exist; in that case the index simply does not appear (the API still rejects new duplicates, so the application is protected, but the database-level guarantee is missing).

1. Before deploying to a database with data, run the **read-only** report: `node scripts/report-duplicate-reviews.js`. It prints the database host and name (never credentials) and makes no changes. **It has not been run against any real database.**
2. If it lists duplicates, keep the newest of each group and delete the rest manually, then redeploy (or restart) so the index is built.

### Things deliberately **not** migrated

- Historical orders that were cancelled before this release may have leaked stock (the old code never returned it). Phase 1 does not rewrite stock. If wanted, compute expected stock per book from order history (read-only) and adjust record by record with approval.
- Existing weak passwords and legacy `userType` spellings are left as they are.

## 5. Rollback

- **Code:** redeploy the previous release. The new optional fields are ignored by the old code.
- **Caveat:** the old code does not know about `archivedAt`, so books and shops archived by the new code would **reappear** in catalogues and be orderable again. To avoid that, either roll forward, or before rolling back un-archive deliberately, for example in `mongosh` (review first; not run by this project):
  `db.books.updateMany({archivedAt: {$ne: null}}, {$set: {archivedAt: null}})` and the same for `shops`.
- Anonymised user tombstones stay anonymised (the old code cannot log into them: the password is an unusable random hash).
- Orders hidden with `readerArchived` / `shopArchived` would be visible again under the old code; nothing is lost.
- **Index:** to remove the unique review index: `db.reviews.dropIndex("user_1_targetModel_1_targetId_1")`.
- **No data was deleted by Phase 1 itself.** No script was run against any real database; the test suite uses only throwaway local databases.

## 6. Development data

`node seed.js` is now a dry run by default and refuses to wipe any database whose name does not mark it as dev/test/local/sandbox (or equal `SEED_ALLOWED_DB`). It also clears orders, reports and blogs so a re-seed cannot leave dangling references. `backend/check_db.js` (prints user emails) and `scripts/refresh-demo-books.js` are unchanged and should only be run knowingly.
