# Product Catalog Service

A focused slice of an e-commerce backend and storefront: browse, search, filter and sort a catalog of **50,000+ products**, with role-based admin management.

**Stack:** React 19 (Vite) · Tailwind CSS v4 · Node.js / Express · MongoDB (Mongoose) · JWT

| | |
|---|---|
| Live app | _add URL after deploy_ |
| API | _add URL after deploy_ |
| Demo admin | `admin@example.com` / _set via seed env_ |
| Demo user | `user@example.com` / _set via seed env_ |

---

## Features

**Customers (role `user`)**: browse the paginated catalog; search with debounced full-text search; filter by category, price range and in-stock; sort by newest, price, name or relevance. All of this lives in the URL, so a view can be shared or bookmarked and back/forward work. Customers can also open product detail pages.

**Admins (role `admin`)**: everything above, plus create / edit / delete products and an analytics dashboard (product count, stock and average price per category).

**UX**: skeleton loaders, empty states, error states with retry, toasts, a delete confirmation dialog, client-side form validation with server errors mapped back to fields, a responsive layout from 320px up, and a mobile menu with collapsible filters.

---

## Project structure

```
.
├── client/                    React + Vite + Tailwind
│   └── src/
│       ├── api/               axios instance (auth header, error normalisation) + endpoint wrappers
│       ├── components/        UI building blocks (ProductCard, Pagination, filters, guards, dialogs…)
│       ├── context/           AuthContext (session, expiry), ToastContext
│       ├── hooks/             useApi (abortable fetching), useDebounce
│       ├── pages/             route-level screens
│       └── utils/             formatting, validation, safe localStorage
├── server/                    Express API
│   ├── api/index.js           Vercel serverless entry (wraps the Express app)
│   ├── scripts/seed.js        50k product seed + demo users
│   ├── src/
│   │   ├── config/            env validation, DB connection
│   │   ├── constants/         categories, roles
│   │   ├── controllers/       thin HTTP layer
│   │   ├── middleware/        auth/RBAC, Joi validation, sanitisation, error handler
│   │   ├── models/            User, Product (+ indexes)
│   │   ├── routes/
│   │   ├── services/          product query building & data access
│   │   ├── utils/             ApiError, asyncHandler, JWT helpers
│   │   └── validators/        Joi schemas for every endpoint
│   └── tests/                 node:test unit + integration tests
└── docker-compose.yml         mongo + seed + api + web
```

---

## Running locally

**Prerequisites:** Node.js 20+ and a MongoDB instance (local `mongod`, Docker, or a free Atlas cluster).

```bash
# 1. API
cd server
cp .env.example .env          # set MONGODB_URI, JWT_SECRET (≥32 chars) and seed passwords
npm install
npm run seed                  # 50,000 products + demo admin/user (~5 s)
npm run dev                   # http://localhost:5000/api

# 2. Front end (new terminal)
cd client
npm install
npm run dev                   # http://localhost:5173  (Vite proxies /api → :5000)
```

### Seed script

```bash
npm run seed                    # 50,000 products (drops existing products first)
npm run seed -- --count=200000  # any size
npm run seed -- --if-empty      # only seed if the collection is empty (used by Docker)
```

- Data is generated with a **seeded PRNG**, so every run produces the same catalog and benchmarks are reproducible. Categories have weighted, realistic distributions; prices are skewed toward the low end of each category's band; ~8% of products are out of stock; `createdAt` is spread over the past year.
- Inserts go through the raw driver in batches of 5,000 and **indexes are built after the bulk load**, which is much faster than maintaining 8 indexes on every insert.
- Admin and user accounts are upserted from `SEED_ADMIN_*` / `SEED_USER_*` env vars, so no credentials live in the code. The admin role can **only** be granted here. The public register endpoint always creates `user`.

### Tests

```bash
cd server && npm test
```

There are 34 tests (built-in `node:test` + `supertest` + `mongodb-memory-server`, so no external DB is needed):
- **Unit**: `buildProductQuery` (filters, sort mapping, tiebreakers, projection, skip/limit) and the list query validator (coercion, caps, rejection of unknown keys and operators).
- **Integration**: register/login, password hashing and never returned, role escalation blocked, 401 vs 403 on every write route, admin CRUD, XSS stripping, NoSQL injection, malformed JSON, invalid ids, CORS allow/deny, security headers.

### Docker (one command)

```bash
cp .env.example .env          # set JWT_SECRET + seed credentials
docker compose up --build     # web → http://localhost:8080, api → http://localhost:5000/api
```

Runs MongoDB, then a one-shot seed container (`--if-empty`), then the API, then nginx serving the built client and proxying `/api` (same origin, so no CORS needed).

---

## API

Base path: `/api`. Errors always have the shape `{ success: false, message, details? }`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | public (rate-limited) | `{ name, email, password }` → `{ token, user }` (role is always `user`) |
| POST | `/auth/login` | public (rate-limited) | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | user | Current user |
| GET | `/products` | public | List. Query: `page`, `limit` (≤100), `q`, `category`, `minPrice`, `maxPrice`, `inStock`, `sort` = `newest` \| `price_asc` \| `price_desc` \| `name_asc` \| `name_desc` \| `relevance` |
| GET | `/products/categories` | public | Category list |
| GET | `/products/:id` | public | Full product document |
| POST | `/products` | **admin** | Create (SKU auto-generated if omitted) |
| PUT | `/products/:id` | **admin** | Update any subset of fields |
| DELETE | `/products/:id` | **admin** | Delete → 204 |
| GET | `/products/stats/categories` | **admin** | Count / stock / avg price per category |
| GET | `/health` | public | Liveness + DB status |

List response:

```json
{
  "items": [{ "_id": "…", "name": "…", "category": "…", "price": 19.99, "stock": 4, "rating": 4.2, "imageUrl": "" }],
  "pagination": { "page": 1, "limit": 20, "total": 50000, "totalPages": 2500 }
}
```

---

## Performance at 50k+ records

### Indexes and why

Every list request is: _optional category equality_ + _optional price range / stock / text filter_ + _one sort key_ + `skip/limit`. The indexes follow the **ESR rule** (Equality → Sort → Range) so MongoDB can walk an index **already in sort order** and stop after `skip + limit` entries, instead of fetching every match and sorting in memory.

| Index | Serves |
|---|---|
| `{ createdAt: -1, _id: -1 }` | default "newest" listing |
| `{ price: 1, _id: 1 }` | price sort, both directions (indexes can be walked backwards) |
| `{ name: 1, _id: 1 }` | name sort |
| `{ category: 1, createdAt: -1, _id: -1 }` | category filter + newest |
| `{ category: 1, price: 1, _id: 1 }` | category filter + price sort **and** category + price range |
| `{ category: 1, name: 1, _id: 1 }` | category filter + name sort |
| text `{ name: 10, description: 2 }` | full-text search; name matches weigh 5× more |
| `{ sku: 1 }` unique, `{ email: 1 }` unique | data integrity + login lookup |

**Why `_id` in each index?** It's the tiebreaker in every sort. Thousands of products share a price, and without a unique tiebreaker the order among equal prices is undefined, so items can repeat or vanish between pages. Including `_id` in the index keeps the tiebroken sort fully index-backed.

**Trade-off:** six compound indexes slow down writes slightly and use extra storage. For a catalog that is read far more often than written, that's the right call.

### Measured (local MongoDB, 50,000 products, `explain("executionStats")`)

| Query | Plan | Keys examined | Docs fetched | Time |
|---|---|---|---|---|
| default listing | IXSCAN → LIMIT | 20 | 20 | 2 ms |
| `category=Books&sort=price_desc` | IXSCAN | 20 | 20 | <6 ms |
| `category + price range + price sort` | IXSCAN | 20 | 20 | <1 ms |
| `sort=price_asc&page=2000` (deep page) | IXSCAN → SKIP | 40,000 | **20** | 20 ms |
| `q=wireless headphones` | TEXT → SORT | ~1,000 | ~1,000 | 7 ms |

There is no in-memory `SORT` stage on any non-text query, and documents are only fetched for the page actually returned. A full API round-trip for a page is ~3–25 ms and ~3 KB.

### Other measures

- **DB-level pagination** with `skip/limit`. Only one page ever reaches Node, and documents come back as `.lean()` plain objects.
- **Projection on the list view**: only `name, category, price, stock, rating, imageUrl`. The description and audit fields are only returned by the detail endpoint.
- **Counting**: `estimatedDocumentCount()` (collection metadata, O(1)) when there is no filter; `countDocuments(filter)` (index-backed) otherwise. It runs in parallel with the page query.
- **Page size capped at 100** by validation, so a client can't ask for 50k rows.
- **Front end**: search input debounced (400 ms); in-flight requests are aborted when filters change, so a slow response can never overwrite a newer one; the previous page stays visible (dimmed) while the next one loads.

**Known limitation:** `skip` cost grows linearly with page depth (page 2,000 scans 40k index keys ≈ 20 ms). That's fine at this scale. For millions of rows or infinite scroll I'd switch to **keyset (cursor) pagination** (`WHERE (price, _id) > (lastPrice, lastId)`), which is O(limit) at any depth but can't jump to an arbitrary page number.

---

## Security checklist

| Requirement | Implementation |
|---|---|
| `.env` for all secrets, git-ignored | `dotenv` + **Joi-validated env at boot** (refuses to start if `JWT_SECRET` is missing or < 32 chars). `.env*` is ignored; only `.env.example` files are committed. |
| Passwords hashed, never returned | bcrypt (12 rounds) in a pre-save hook. `password` has `select: false` **and** is removed in `toJSON`. Login returns the same message for unknown email and wrong password. |
| Sane JWT expiry | `2h` (configurable). Algorithm pinned to HS256 on verify. The client decodes `exp` and logs out proactively; any 401 clears the session. |
| Server-side authorization on every protected route | `authenticate` (re-loads the user from the DB every request, so deleted users and role changes apply immediately) → `authorize('admin')`. Unauthenticated → **401**, authenticated non-admin → **403**. Auth runs *before* validation, so non-admins don't learn the payload schema. |
| Server-side input validation | Joi schemas for the body, query **and** params of every endpoint. Unknown keys are rejected (e.g. `role: "admin"` on register → 400). Query values are type-coerced, enums are whitelisted, and sizes are capped. |
| NoSQL injection | `express-mongo-sanitize` strips `$`/`.` keys. Joi also rejects non-string values (so `{ "email": { "$gt": "" } }` → 400). Sort fields come from a whitelist map and are never interpolated. |
| XSS | All free-text fields are passed through `xss` with an empty whitelist, which strips tags (and `<script>` contents) **before storage**. `helmet` sets CSP and other headers. React escapes all output, and no `dangerouslySetInnerHTML` is used. |
| No stack traces or raw DB errors | Central error handler: known errors (validation, CastError, duplicate key, JWT, malformed JSON, payload too large) are mapped to clean 4xx messages. Anything else is logged server-side and returns a generic 500. |
| Deliberate CORS | Explicit origin allow-list from `CORS_ORIGINS`, `credentials: false` (auth uses a Bearer header, not cookies), and limited methods and headers. Unknown origins get a 403. |

**Also:** rate limiting (20 failed auth attempts per 15 min per IP, 300 req/min per IP overall), a 10 KB JSON body limit, `x-powered-by` disabled, and `trust proxy` set for correct client IPs behind a hosting proxy.

---

## Key decisions

- **Layering: routes → middleware → controller → service → model.** Controllers stay thin. The query-building logic is a pure function (`buildProductQuery`), which makes it unit-testable without a database.
- **Bearer token in `localStorage` instead of an httpOnly cookie.** The front end and API are on different free-tier domains, and cross-site cookies would need `SameSite=None` plus CSRF protection. A Bearer token keeps CORS credential-free and avoids CSRF by design. The trade-off is that a successful XSS could read the token, which is why XSS is stopped at input (stripping), at output (React escaping) and by CSP, and why the token is short-lived (2h). In a same-site deployment I'd move to an httpOnly `SameSite=Strict` cookie.
- **MongoDB `$text` search** instead of regex. Regex with a leading wildcard can't use an index; `$text` is index-backed and gives relevance ranking. The trade-off is that it matches whole words or stems, not prefixes (`"head"` won't match `"headphones"`). Atlas Search would be the upgrade path for autocomplete or fuzzy matching.
- **`_id` tiebreaker on every sort** for stable pagination (see above).
- **Admin role only via the seed script.** No API path can grant admin.
- **The URL is the source of truth** for list state. Filters, sort, search and page are read from and written to query params, and the detail page links "back" to the exact list view you came from.
- **No UI or form libraries.** Tailwind, a small set of inline SVG icons and a ~40-line `FormField` keep the bundle small (~114 KB gzipped JS) and every line explainable.

---

## Deployment (free tier)

Both the API and the front end run on **Vercel** (two projects from this one repo), with the database on **MongoDB Atlas M0**. Nothing here needs a credit card.

1. **MongoDB Atlas (M0):** create a cluster and a database user. Under Network Access, allow `0.0.0.0/0`, because Vercel functions don't have fixed IPs. Copy the `mongodb+srv://…/product-catalog` URI.
2. **Seed Atlas** from your machine: put the Atlas URI in `server/.env`, then run `npm run seed`. 50k products is ~20 MB, well under the 512 MB M0 limit.
3. **API → Vercel project #1**, root directory `server`. [`server/api/index.js`](server/api/index.js) wraps the same Express app as a serverless function, and [`server/vercel.json`](server/vercel.json) rewrites every path to it and pins the region (`icn1`, next to the Atlas cluster in Seoul). Env vars: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN=2h`, `CORS_ORIGINS=https://<frontend-domain>`.
4. **Front end → Vercel project #2**, root directory `client` (Vite is auto-detected). Env: `VITE_API_URL=https://<api-domain>/api`. [`client/vercel.json`](client/vercel.json) rewrites all paths to `index.html` so deep links work.
5. Once the front-end URL is known, set it in the API's `CORS_ORIGINS` and redeploy the API.

**Serverless notes:**
- The Mongo connection is cached per warm function instance, not opened on every request.
- The in-memory rate limiter counts per function instance, so on Vercel it's a best-effort limit. A shared store (Redis/Upstash) would make it global.
- `npm start` (Docker or any Node host) runs the same app as a normal long-lived server.

## Skipped / future work

- **Cart & orders (bonus):** skipped to keep the time on the core.
- **Product images:** seeded products use generated category-coloured placeholders; admins can set an `imageUrl`. Real uploads would go to S3/Cloudinary with signed URLs.
- **Keyset pagination** for very deep pages or infinite scroll (see the Performance section).
- **Refresh tokens / token revocation list:** the current design uses a single short-lived access token.
- **Prefix or fuzzy search** (Atlas Search), and front-end component tests (Vitest + Testing Library).
