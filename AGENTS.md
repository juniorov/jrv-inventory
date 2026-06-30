# JRV Inventory

PWA for managing family meal orders: clients, products, production batches, payments, and profits.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite 8 |
| UI | Tailwind CSS 4 (Vite plugin, no PostCSS) |
| State | Pinia 3 |
| Router | Vue Router 4 |
| Backend | Firebase Auth (Google) + Firestore |
| Charts | Chart.js + vue-chartjs |
| PWA | vite-plugin-pwa (Workbox, autoUpdate, NetworkFirst for Firestore) |
| Deploy | Netlify (`npm run build` → `dist/`, SPA redirect `/* → /index.html`) |

## Commands

```sh
npm run dev       # Vite dev server
npm run build     # Build to dist/
npm run preview   # Preview production build
```

No tests, lint, typecheck, or formatter configured.

## Firestore

All data is subcollections of `companies/{companyId}`. The `db` instance uses `persistentLocalCache` + `persistentMultipleTabManager` for offline.

```
companies/{companyId}/
  members/{id}           name, email, status ("pending"|"active"), role, createdAt
  clients/{id}           name, phone, googleMapsUrl, createdAt
  products/{id}          name, price, createdAt
  orderLists/{id}        date, notes, createdAt
  orders/{id}            orderListId, clientId, productId, quantity, unitPrice, total
                         payments: [{ method, amount, date, createdAt }]
  batches/{id}           date, orderListId, totalCost, spends: [{ concept, amount }], notes, createdAt
  payments/{id}          clientId, orderId, amount, method, date, notes, createdAt
  deliveryGroups/{id}    name, clientIds: string[]
```

Root collections: `companies/{id}`, `companyMembers/{id}`, `invitations/{token}`.

Security rules: any auth user can read/write everything except `invitations` (read: public, write: auth).

Env vars: `VITE_FIREBASE_*` (see `.env.example`). Package name is `jrvi-app` to avoid Firebase Project ID conflict.

## Architecture

### Routes (all lazy-loaded, inside auth+company guard)

| Path | View | Notes |
|------|------|-------|
| `/login` | Login | Public, Google auth |
| `/onboarding` | Onboarding | Create company |
| `/invite/:token` | Invite | Public (accept invitation) |
| `/` | Dashboard | Income/expense/profit summary, monthly bar chart |
| `/clients` | Clients | CRUD |
| `/products` | Products | CRUD |
| `/order-lists` | OrderLists | |
| `/order-lists/:id` | OrderListDetail | Orders + payments per list |
| `/batches` | Batches | Production lot costs |
| `/delivery-groups` | DeliveryGroups | Client routing groups |
| `/delivery-groups/:id` | DeliveryGroupDetail | Group detail with per-client pay |
| `/payments` | Payments | Global payments view |
| `/members` | Members | Company members |
| `/invitations` | Invitations | Generate invite links |
| `/settings` | Settings | |

### Key helpers (`src/utils/helpers.js`)

- `getCollectionRef(companyId, name)` → Firestore ref for `companies/{companyId}/{name}`
- `createDocument`, `updateDocument`, `deleteDocument` — auto-add `createdAt` (serverTimestamp)
- `subscribeToCollection(companyId, name, callback, orderBy?, direction?)` — real-time listener, returns unsubscribe
- `formatCurrency(amount)` → CRC formatting (`es-CR` locale)
- `timestampToDate(ts)` → Spanish date string

### Business logic

- **Batches**: `totalCost` is computed from `spends` array (`[{ concept, amount }]`). Dashboard profit = sum of `total` from orders in linked `orderListId` minus `totalCost`. Legacy entries without `spends` still work via `totalCost`.
- **Orders**: Each order has a `payments` array. Status: Pendiente (0 paid), Parcial (>0 and < total), Pagado (≥ total). Payment replicas to `payments` collection.

### Source layout

```
src/
  main.js              → Pinia → Firebase init → mount (wait for auth ready)
  App.vue              → Loading spinner + router-view + install banner
  firebase/index.js    → Firebase init, exports auth + db
  stores/auth.js       → Auth (Google), company, invitations
  router/index.js      → 15 routes, auth/company guards, pending invite redirect
  utils/helpers.js     → Firestore CRUD + subscriptions + currency
  services/auth.service.js  → Firebase Auth primitives
  composables/         → Empty (available for new composables)
  components/          → Modal, PageHeader, EmptyState, DeleteConfirm, SearchSelect
  layouts/Default.vue  → Responsive sidebar + nav + profile footer
  views/               → 18 views (3 orphaned: Expenses, Incomes, JoinCompany — not in router)
```

### Caveats

- `src/views/Expenses.vue` and `Incomes.vue` exist but are NOT in the router. They read from `expenses` and `incomes` subcollections that may not exist in Firestore. Do not add them to the nav without understanding the data model.
- `src/views/JoinCompany.vue` exists but is not in the router.
- No composables yet — the `composables/` dir is empty.
- Currency is CRC (Costa Rican Colón) everywhere.
- UI language is Spanish (es).
- Tailwind 4 with `@tailwindcss/vite` plugin (no PostCSS/tailwind.config needed).
- Chart.js is registered manually in `Dashboard.vue`.
- Modal component supports `sm`, `md` (default), `lg`, `xl` sizes.
- Recurring CSS pattern: `rounded-xl border px-4 py-3` for inputs, `rounded-2xl border bg-white p-4 shadow-sm` for cards.
