# Panel Leonardo

Sistema de gestión completo para distribuidora de papelería/descartables.

## Stack
- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + Storage)
- **Prisma** ORM
- **jsPDF** para generación de PDFs

## Módulos
- ✅ Clientes (ABM, perfil, saldo, frecuentes)
- ✅ Artículos (catálogo, filtros, actualización masiva de precios)
- ✅ Pedidos (creación, edición, cierre, PDF/boleta)
- ✅ Logística (consolidación de pedidos, lista de armado PDF)
- ✅ Packs (armado, impresión A4)

## Setup

### 1. Variables de entorno
Copiá `.env.local` y completá con tus credenciales de Supabase:

```env
DATABASE_URL="postgresql://postgres.[ref]:[pass]@pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[pass]@pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[service-role-key]"
```

### 2. Generar schema en DB
```bash
npx prisma db push
```

### 3. Desarrollo local
```bash
npm run dev
```

### 4. Deploy en Vercel
1. Conectar repo en [vercel.com](https://vercel.com)
2. Agregar las variables de entorno en Vercel
3. Deploy automático desde GitHub
