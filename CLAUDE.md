# Panel-Leonardo — Documentación del proyecto

Sistema de gestión de pedidos, artículos y clientes para **Papelera Leo**.
Deploy: Vercel + Supabase (PostgreSQL). Repo en GitHub.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js (App Router) |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL vía Prisma ORM |
| Hosting DB | Supabase |
| Deploy | Vercel |
| Estilos | Tailwind CSS v4 |
| PDF | jsPDF + html2canvas + qrcode |
| Export | xlsx (Excel), CSV manual |
| Estado | useState / useCallback (sin Redux) |

---

## Estructura de carpetas

```
app/
  api/                  # API Routes (Next.js Route Handlers)
    articulos/          # GET (búsqueda), POST (crear)
    articulos/[id]/     # PUT (editar), DELETE
    articulos/masivo/   # PUT (aumento masivo de precios)
    clientes/           # GET, POST
    clientes/[id]/pagos/       # POST (registrar pago)
    clientes/[id]/frecuentes/  # GET (artículos frecuentes del cliente)
    pedidos/            # GET, POST
    pedidos/[id]/       # PUT (editar), DELETE
    pedidos/[id]/cerrar/       # POST (cierra pedido y actualiza saldo)
    proveedores/        # CRUD
    rubros/             # CRUD
    logistica/consolidar/ # POST (consolida pedidos para armado)
    packs/              # CRUD
  articulos/            # Página de artículos
  clientes/             # Lista de clientes
  clientes/[id]/        # Detalle/cuenta corriente del cliente
  pedidos/              # Lista de pedidos
  pedidos/[id]/         # Detalle y edición del pedido
  pedidos/nuevo/        # Crear pedido nuevo
  proveedores/          # Página de proveedores
  rubros/               # Categorías
  logistica/            # Lista de armado (consolidado de pedidos)
  packs/                # Paquetes prearmados
  page.tsx              # Dashboard (KPIs + últimos pedidos)
  layout.tsx            # Layout raíz

components/
  PedidoDetalle.tsx     # Edición de pedido + generación de PDF boleta
  ExportPDF.tsx         # Exportaciones PDF (listas, clientes, artículos, packs)
  ArticuloNombreEditor.tsx    # Editor inline de nombre
  ArticuloPrecioEditor.tsx    # Editor inline de precio/costo
  ArticuloProveedorEditor.tsx # Editor inline de proveedor
  ClienteInlineEditor.tsx     # Editor inline de datos del cliente
  ClienteSaldoEditor.tsx      # Editor inline de saldo
  Sidebar.tsx           # Navegación lateral

lib/
  prisma.ts             # Singleton del cliente Prisma
  supabase.ts           # Cliente Supabase
  utils.ts              # formatCurrency, formatDate, getSaldoStatus, etc.

prisma/
  schema.prisma         # Esquema de la base de datos
```

---

## Modelos de la base de datos (Prisma)

```
Rubro          → id, nombre
Proveedor      → id, nombre, telefono
Articulo       → id, nombre, costo, precio, unidad, permiteDecimal, fechaPrecio, activo, rubroId, proveedorId
Cliente        → id, nombre, localidad, direccion, telefono, saldo, activo
Pedido         → id, numero (único, auto), estado, total, saldoAnterior, notas, clienteId
PedidoItem     → id, pedidoId, articuloId, cantidad, precioUnitario, descuento, estadoItem
MovimientoCC   → id, clienteId, pedidoId?, tipo, monto, descripcion, createdAt
Pack           → id, nombre, descripcion, rubroId
PackItem       → id, packId, articuloId, cantidadSugerida
```

---

## Lógica de listas de precios

Las listas se calculan dinámicamente en el momento de agregar un artículo al pedido nuevo.

```
Lista 1 → costo × 1.20  (+20%)
Lista 2 → costo × 1.25  (+25%)
Lista 3 → costo × 1.35  (+35%)
```

- Si el artículo tiene `costo = 0`, se usa `precio` como fallback.
- La lógica está en `/app/pedidos/nuevo/page.tsx` → `getPrecioBase()` + `addItem()`.
- Una vez guardado el pedido, el `precioUnitario` queda fijo en el `PedidoItem` (precio histórico).

---

## Generación de PDF boleta

**Archivo:** `components/PedidoDetalle.tsx` → función `generarPDF()`

- Librería: jsPDF (formato A4, unidad mm)
- Header: "Papelera" (grande) + "Leo" + teléfono (izquierda) + QR WhatsApp (derecha)
- Contacto Leo: `11 3808-8724` / `https://wa.me/5491138088724`
- Incluye: número de pedido, fecha, cliente, tabla de ítems, subtotal, saldo anterior, total
- Los otros PDFs (listas, clientes, packs) usan `pdfHeader()` en `components/ExportPDF.tsx`

---

## Estados de un pedido

| Estado | Descripción |
|---|---|
| `pendiente` | Pendiente de armado |
| `armado` | Armado y listo para entregar |
| `cerrado` | Cerrado — actualizó saldo del cliente |

Al cerrar un pedido, se crea un `MovimientoCC` de tipo `cargo` y se actualiza `Cliente.saldo`.

---

## Saldo de clientes

- `saldo > 0` → el cliente tiene **deuda** (rojo)
- `saldo < 0` → el cliente tiene **saldo a favor** (verde)
- Al crear el pedido se captura `saldoAnterior`
- Al cerrar el pedido se suma el total al saldo actual

---

## Patrones de API

- Rutas: `app/api/[recurso]/route.ts` → GET + POST
- Rutas dinámicas: `app/api/[recurso]/[id]/route.ts` → PUT + DELETE
- Acciones especiales: `app/api/[recurso]/[id]/[accion]/route.ts`
- Todas las rutas usan Prisma para acceder a la base de datos
- **IMPORTANTE:** Agregar `export const dynamic = 'force-dynamic'` a rutas GET que devuelven datos que cambian frecuentemente (artículos, precios) para evitar caché de Vercel CDN

---

## Variables de entorno necesarias

```
DATABASE_URL=        # Connection string PostgreSQL (Supabase, con pooling)
DIRECT_URL=          # Direct connection string (para Prisma migrations)
```

---

## Comandos útiles

```bash
npm run dev          # Desarrollo local (http://localhost:3000)
npm run build        # Build de producción
npx prisma db push   # Aplicar cambios del schema a la DB
npx prisma studio    # GUI para la base de datos
```

---

## Notas de deploy (Vercel)

- El deploy es automático al hacer push a `main`
- Las variables de entorno se configuran en el dashboard de Vercel
- Las rutas API usan serverless functions (Node.js runtime)
- Para evitar respuestas cacheadas en rutas GET dinámicas, usar `export const dynamic = 'force-dynamic'`
