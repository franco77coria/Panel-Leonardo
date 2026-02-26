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
    clientesSaldos,
  ] = await Promise.all([
    prisma.pedido.findMany({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    prisma.pedido.count({ where: { estado: 'pendiente' } }),
    prisma.cliente.count({ where: { saldo: { gt: 0 }, activo: true } }),
    prisma.pedido.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: { nombre: true } } },
    }),
    prisma.cliente.findMany({
      where: { activo: true, saldo: { not: 0 } },
      select: { saldo: true },
    }),
  ])

  const totalHoy = pedidosHoy.reduce((sum, p) => sum + Number(p.total), 0)

  let totalDeuda = 0
  let totalAFavor = 0
  for (const c of clientesSaldos) {
    const s = Number(c.saldo)
    if (s > 0) totalDeuda += s
    else if (s < 0) totalAFavor += Math.abs(s)
  }

  return { pedidosHoy: pedidosHoy.length, totalHoy, pedidosPendientes, clientesConDeuda, ultimosPedidos, totalDeuda, totalAFavor }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const kpis = [
    { label: 'Pedidos de hoy', value: data.pedidosHoy, sub: 'Pedidos cargados hoy', color: 'var(--blue)' },
    { label: 'Total a cobrar hoy', value: formatCurrency(data.totalHoy), sub: 'Suma de pedidos de hoy', color: 'var(--green)' },
    { label: 'Pendientes de armado', value: data.pedidosPendientes, sub: 'Pedidos sin armar', color: 'var(--yellow)' },
    { label: 'Clientes con deuda', value: data.clientesConDeuda, sub: 'Cuentas corrientes activas', color: 'var(--red)' },
    { label: 'Deuda Total', value: formatCurrency(data.totalDeuda), sub: 'Suma de saldos deudores', color: 'var(--red)' },
    { label: 'Total a Favor', value: formatCurrency(data.totalAFavor), sub: 'Suma de saldos a favor (crédito)', color: 'var(--green)' },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen general del sistema</p>
        </div>
        <div className="page-actions">
          <Link href="/pedidos/nuevo" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nuevo Pedido
          </Link>
          <Link href="/logistica" className="btn btn-secondary">Lista de Armado</Link>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="kpi-sub">{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
          <Link href="/pedidos/nuevo" className="btn btn-primary btn-lg">Nuevo Pedido</Link>
          <Link href="/logistica" className="btn btn-secondary btn-lg">Lista de Armado</Link>
          <Link href="/clientes/nuevo" className="btn btn-secondary btn-lg">Nuevo Cliente</Link>
          <Link href="/articulos" className="btn btn-secondary btn-lg">Ver Artículos</Link>
          <Link href="/packs" className="btn btn-secondary btn-lg">Ver Packs</Link>
        </div>

        <div className="table-container">
          <div className="table-header">
            <span className="table-title">Últimos Pedidos</span>
            <Link href="/pedidos" className="btn btn-ghost btn-sm">Ver todos</Link>
          </div>
          {data.ultimosPedidos.length === 0 ? (
            <div className="empty-state">
              <p>No hay pedidos aún.</p>
              <Link href="/pedidos/nuevo" className="btn btn-primary">Nuevo Pedido</Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>N° Pedido</th>
                  <th>Cliente</th>
                  <th className="hide-mobile">Fecha</th>
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
                      <td className="hide-mobile">{formatDate(pedido.createdAt)}</td>
                      <td><strong>{formatCurrency(Number(pedido.total))}</strong></td>
                      <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                      <td><Link href={`/pedidos/${pedido.id}`} className="btn btn-ghost btn-sm">Ver</Link></td>
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
