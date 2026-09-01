# Accesorios de Caballero — E-commerce

Plataforma de comercio electrónico para venta de relojes, gafas, pulseras y
zapatos, con SEO técnico, checkout con pasarelas colombianas y notificaciones
transaccionales por WhatsApp vía n8n.

## Arquitectura

```
ecommerce-caballero/
├── backend/     API REST (Node.js + Express + PostgreSQL)
├── frontend/    Next.js (App Router, SSR, SEO)
├── n8n/         Workflow de mensajería transaccional (WhatsApp)
├── nginx/       Reverse proxy para producción
└── docker-compose.yml
```

**Flujo de una compra:**

```
Cliente (frontend Next.js)
  → POST /api/ordenes (backend, valida stock, congela precios, crea orden)
  → POST /api/pagos/:ordenId/iniciar (crea transacción en Wompi)
  → Cliente paga en Wompi
  → Wompi llama POST /api/pagos/webhook/wompi (firma verificada)
  → backend marca la orden como 'paid' y dispara el webhook de n8n
  → n8n envía la confirmación por WhatsApp (Meta Cloud API)
```

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js 20, Express, PostgreSQL (`pg`), Zod |
| Auth | Firebase Auth (ID tokens verificados en el backend) |
| Frontend | Next.js 14 (App Router, SSR + ISR) |
| Pagos | Wompi (PSE, Nequi, tarjetas) |
| Mensajería | n8n + WhatsApp Cloud API (Meta) |
| Infra | Docker Compose + nginx, VPS Hostinger |

## Correr todo en local

### 1. Base de datos

```bash
docker run --name pg-local -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ecommerce_caballero -p 5432:5432 -d postgres:16-alpine
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # completa DATABASE_URL, FIREBASE_*, WOMPI_*
npm install
npm run migrate
npm run dev             # http://localhost:4000
```

**Tests** (no requieren Postgres real — usan [pg-mem](https://github.com/oguimbal/pg-mem) para probar
transacciones/constraints reales en memoria, y mockean `fetch` para Wompi):

```bash
npm test
```

Cubren la lógica más sensible: la transacción de stock al crear una orden
(`test/order.repository.test.mjs`) y la firma de integridad / verificación
de checksum del webhook de Wompi (`test/wompi.client.test.mjs`). Requiere
Node.js 22+ (usa `--experimental-test-module-mocks`).

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev             # http://localhost:3000
```

### 4. n8n (opcional en local)

```bash
docker run -it --rm -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n
```

Importa `n8n/workflows/notificaciones-whatsapp.json` desde la UI de n8n.

## Endpoints principales del backend

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/productos` | Catálogo con paginación y filtros (`page`, `limit`, `categoriaId`, `marca`, `precioMin`, `precioMax`, `q`) |
| GET | `/api/productos/:slug` | Detalle de producto |
| GET | `/api/categorias` | Árbol de categorías |
| POST | `/api/ordenes` | Crear orden (requiere Firebase Auth) |
| POST | `/api/pagos/:ordenId/iniciar` | Iniciar cobro en Wompi (requiere Auth) |
| POST | `/api/pagos/webhook/wompi` | Webhook de confirmación de pago (firma verificada) |
| GET | `/feed/productos.xml` | Feed XML para Instagram Shopping / Facebook Shop |

#### Body de `POST /api/pagos/:ordenId/iniciar` según el método de pago de la orden

Wompi exige campos distintos por método — no basta con el tipo:

| Método (`metodo_pago` de la orden) | Body requerido |
|---|---|
| `pse` | `{ userType: 'natural'\|'juridica', userLegalIdType: 'CC'\|'CE'\|'NIT', userLegalId, financialInstitutionCode }` |
| `nequi` | `{ phoneNumber }` (celular colombiano, ej: `3001234567`) |
| `credit_card` / `debit_card` | `{ cardToken, installments? }` — `cardToken` se obtiene tokenizando la tarjeta con **Wompi.js en el frontend**; el número de tarjeta **nunca** debe llegar a este backend (PCI compliance) |

### Panel de administración (requieren rol `admin` en la tabla `usuarios`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/productos` | Crear producto |
| PATCH | `/api/productos/:id` | Editar producto (parcial) |
| PATCH | `/api/productos/:id/stock` | Ajustar stock |
| DELETE | `/api/productos/:id` | Dar de baja (soft delete) |
| POST | `/api/categorias` | Crear categoría |
| PATCH | `/api/categorias/:id` | Editar categoría |
| GET | `/api/ordenes/admin` | Listar todas las órdenes (filtro `estado`, paginado) |
| GET | `/api/ordenes/admin/:id` | Ver cualquier orden |
| PATCH | `/api/ordenes/admin/:id/envio` | Cambiar estado logístico / registrar guía de envío (dispara `guia.enviada` a n8n la primera vez que se registra la guía) |

Para dar el primer usuario admin: `UPDATE usuarios SET rol = 'admin' WHERE email = 'tu@email.com';`
No hay endpoint HTTP para esto — es deliberado, evita que alguien se autopromueva a admin vía API.

## Despliegue a producción

Ver [`DEPLOYMENT.md`](./DEPLOYMENT.md) para la guía completa de despliegue en
un VPS de Hostinger con Docker Compose, HTTPS (Certbot) y configuración de n8n.

## Decisiones de diseño relevantes

- **Precios y stock siempre desde la base de datos**: el backend nunca confía
  en un monto o precio enviado por el cliente; se recalculan en cada compra
  dentro de una transacción SQL con `FOR UPDATE` para evitar sobreventa.
- **`detalle_ordenes` es un snapshot histórico**: si el precio de un producto
  cambia después, las órdenes pasadas no se alteran.
- **El webhook de n8n nunca bloquea la confirmación de pago**: si n8n está
  caído, el pago se marca igual como aprobado; solo se pierde temporalmente
  la notificación de WhatsApp (se loguea el fallo).
- **SEO first en el frontend**: todo lo visible a Google (título, meta
  description, JSON-LD, imágenes) se renderiza en el servidor (Server
  Components), no depende de JavaScript del cliente.

## Próximos pasos sugeridos

- Frontend del panel de administración (hoy solo existe la API; el admin usa Postman/curl o un cliente propio).
- Tests de integración end-to-end del checkout completo (orden -> pago -> webhook) con Playwright o Supertest.
- App móvil en Kotlin Multiplatform consumiendo la misma API REST.
