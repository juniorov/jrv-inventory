# JRV Inventory — PWA de control de inventario

App para gestionar pedidos de comidas familiares, clientes, productos, lotes de producción, pagos y ganancias.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite 8 |
| UI | Tailwind CSS 4 |
| Estado | Pinia |
| Router | Vue Router 4 |
| Backend/Datos | Firebase Auth + Firestore |
| PWA | vite-plugin-pwa (Workbox) |
| Deploy | Netlify (con netlify.toml) |

## Firestore — Colecciones

### Raíz

```
companies/{companyId}
  name: string
  createdAt: string (ISO)

companyMembers/{memberId}
  companyId: string
  userId: string
  email: string
  displayName: string
  role: "admin" | "member"
  joinedAt: string (ISO)

invitations/{token}
  companyId: string
  memberId: string
  email: string
  name: string
  status: "pending" | "accepted"
  createdAt: string (ISO)
```

### Subcolecciones de cada empresa

```
companies/{companyId}/
  members/{id}
    name, email, status ("pending"|"active"), role, createdAt

  clients/{id}
    name, phone, googleMapsUrl, createdAt

  products/{id}
    name, price, createdAt

  orderLists/{id}
    date, notes, createdAt

  orders/{id}
    orderListId, clientId, productId, quantity, unitPrice, total
    payments: [{ method: "efectivo"|"sinpe"|"otro", amount, date, createdAt }]

  batches/{id}
    date, orderListId, totalCost, notes, createdAt

  payments/{id}
    clientId, orderId, amount, method ("efectivo"|"sinpe"|"otro"), date, notes, createdAt

  expenses/{id}   ← eliminado, los gastos van en batches
  incomes/{id}    ← eliminado, los ingresos se calculan de orders
```

## Rutas

| Ruta | Vista | Requiere |
|------|-------|----------|
| `/login` | Login con Google | guest |
| `/onboarding` | Crear empresa | auth |
| `/invite/:token` | Aceptar invitación | guest |
| `/` | Dashboard | auth + empresa |
| `/clients` | CRUD Clientes | auth + empresa |
| `/products` | CRUD Productos | auth + empresa |
| `/order-lists` | Listas de pedidos | auth + empresa |
| `/order-lists/:id` | Pedidos de una lista + pagos | auth + empresa |
| `/batches` | Lotes de producción | auth + empresa |
| `/payments` | Pagos por cliente | auth + empresa |
| `/members` | Socios de la empresa | auth + empresa |
| `/invitations` | Generar links de invitación | auth + empresa |
| `/settings` | Configuración | auth + empresa |

## Estructura del código

```
src/
  components/     → Componentes reutilizables
    Modal.vue, PageHeader.vue, EmptyState.vue,
    DeleteConfirm.vue, SearchSelect.vue
  layouts/
    Default.vue   → Sidebar responsive + nav + footer perfil
  router/
    index.js      → 13 rutas, guard de auth/empresa
  stores/
    auth.js       → Auth (Google), empresa, invitaciones
  utils/
    helpers.js    → Funciones Firestore (CRUD, subscripciones, formato)
    firebase.js   → (eliminado, migrado a src/firebase/)
  views/          → 13 vistas (una por ruta)
  firebase/
    index.js      → init Firebase + persistencia offline
  App.vue         → Loading state + router-view
  main.js         → Bootstrap: Pinia → Firebase init → mount
  style.css       → Tailwind base + resets
```

## Lógica de negocio

### Lotes y ganancias
- Un **lote** registra: fecha, costo total de ingredientes y una lista de pedidos asociada.
- El **ingreso** de un lote = suma de `total` de todas las órdenes en la lista vinculada.
- La **ganancia** del lote = ingreso − costo.
- Dashboard calcula: Ingresos totales (órdenes vinculadas a lotes) − Gastos totales (costos de lotes) = Ganancia neta.

### Pagos por pedido
- Cada orden tiene un array `payments` donde se guardan los pagos.
- Estado de la orden: **Pendiente** (0 pagado), **Parcial** (>0 y < total), **Pagado** (≥ total).
- Desde la lista de pedidos se puede pagar directamente con método (Efectivo/Sinpe Móvil/Otro).
- El pago también se replica a la colección `payments` para visibilidad global.

### Socios e invitaciones
1. El admin agrega socios en `/members` (nombre, email, status `pending`).
2. En `/invitations` selecciona un socio pendiente y genera un link único con token.
3. El socio abre `/invite/:token`, inicia sesión con Google.
4. El sistema verifica que el email coincida con la invitación.
5. Si todo ok: crea `companyMember`, marca socio como `active` e invitación como `accepted`.

### Offline
- Firestore con `persistentLocalCache` y `persistentMultipleTabManager`.
- Service worker precachea todos los assets (JS, CSS, HTML, SVG).
- Navegación offline con `navigateFallback: /index.html`.
- Datos Firestore cacheados con estrategia `NetworkFirst`.

## PWA

- Manifest con nombre, iconos SVG (192 y 512), theme_color `#059669`.
- Service worker generado por `vite-plugin-pwa` (autoUpdate).
- Meta tags iOS: `apple-mobile-web-app-capable`, `apple-touch-icon`.
- Para instalar: navegar, esperar service worker, usar "Agregar a pantalla de inicio".

## Deploy (Netlify)

- `netlify.toml`: build command `npm run build`, publish `dist`, redirect `/* → /index.html`.
- Variables de entorno requeridas: `VITE_FIREBASE_*` (ver `.env.example`).
- El `package.json` se renombró a `jrvi-app` para evitar conflicto con el Project ID de Firebase.

## Variables de entorno

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Reglas de Firestore

Mínimas: cualquier usuario autenticado puede leer/escribir todo. El control de acceso por empresa se maneja desde la app filtrando por `companyId`.

## Historial de cambios relevantes

1. Scaffolding: Vue 3 + Vite + Tailwind + Firebase + PWA + Router + Pinia.
2. SearchSelect: componente de búsqueda con autocompletado y teclado.
3. Eliminados módulos Gastos/Ingresos: ganancias se calculan de lotes + pedidos.
4. Pagos directos desde lista de pedidos con badge de estado.
5. Socios e invitaciones por token con validación de email.
6. Fix PWA: iconos SVG, meta tags iOS, robot.txt.
7. Offline: persistentLocalCache Firestore + navigateFallback SW.
8. Fix Netlify: rename package para evitar conflicto con Project ID.
