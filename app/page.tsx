import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, getEstadoBadge } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    pedidosHoy,
    pedidosPendientes,
    clientesConDeuda,
    ultimosPedidos,
  ] = await Promise.all([
    prisma.pedido.findMany({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    prisma.pedido.count({ where: { estado: 'pendiente' } }),
    prisma.cliente.count({ where: { saldo: { gt: 0 }, activo: true } }),
    prisma.pedido.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: { nombre: true } } },
    }),
  ])

  const totalHoy = pedidosHoy.reduce((sum, p) => sum + Number(p.total), 0)

  return { pedidosHoy: pedidosHoy.length, totalHoy, pedidosPendientes, clientesConDeuda, ultimosPedidos }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const kpis = [
    { label: 'Pedidos de Hoy', value: data.pedidosHoy, sub: 'pedidos cargados hoy', color: 'var(--blue)' },
    { label: 'Total a Cobrar Hoy', value: formatCurrency(data.totalHoy), sub: 'suma de pedidos de hoy', color: 'var(--green)' },
    { label: 'Pendientes de Armado', value: data.pedidosPendientes, sub: 'pedidos sin armar', color: 'var(--yellow)' },
    { label: 'Clientes con Deuda', value: data.clientesConDeuda, sub: 'cuentas corrientes activas', color: 'var(--red)' },
  ]

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/pedidos/nuevo" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Pedido
          </Link>
          <Link href="/logistica" className="btn btn-secondary">
            Lista de Armado
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* KPIs */}
        <div className="kpi-grid">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="kpi-sub">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Accesos rápidos */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Accesos Rápidos</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/pedidos/nuevo" className="btn btn-primary btn-lg">📋 Nuevo Pedido</Link>
            <Link href="/logistica" className="btn btn-secondary btn-lg">📦 Lista de Armado</Link>
            <Link href="/clientes/nuevo" className="btn btn-secondary btn-lg">👤 Nuevo Cliente</Link>
            <Link href="/articulos" className="btn btn-secondary btn-lg">🏷️ Ver Artículos</Link>
            <Link href="/packs" className="btn btn-secondary btn-lg">🎁 Ver Packs</Link>
          </div>
        </div>

        {/* Últimos pedidos */}
        <div className="table-container">
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>Últimos Pedidos</h2>
            <Link href="/pedidos" style={{ fontSize: 14, color: 'var(--primary-light)', textDecoration: 'none', fontWeight: 600 }}>Ver todos →</Link>
          </div>
          {data.ultimosPedidos.length === 0 ? (
            <div className="empty-state">
              <p>No hay pedidos aún. ¡Cargá el primero!</p>
              <Link href="/pedidos/nuevo" className="btn btn-primary">Nuevo Pedido</Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>N° Pedido</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.ultimosPedidos.map((pedido) => {
                  const badge = getEstadoBadge(pedido.estado)
                  return (
                    <tr key={pedido.id}>
                      <td><strong>#{pedido.numero}</strong></td>
                      <td>{pedido.cliente.nombre}</td>
                      <td>{formatDate(pedido.createdAt)}</td>
                      <td><strong>{formatCurrency(Number(pedido.total))}</strong></td>
                      <td>
                        <span className={`badge ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td>
                        <Link href={`/pedidos/${pedido.id}`} className="btn btn-ghost btn-sm">Ver →</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
