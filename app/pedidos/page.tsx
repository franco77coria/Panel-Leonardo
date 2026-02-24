import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, getEstadoBadge } from '@/lib/utils'
import Link from 'next/link'

export default async function PedidosPage() {
    const pedidos = await prisma.pedido.findMany({
        include: { cliente: { select: { nombre: true } }, items: { select: { id: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
    })

    const pendientes = pedidos.filter(p => p.estado === 'pendiente')
    const armados = pedidos.filter(p => p.estado === 'armado')
    const cerrados = pedidos.filter(p => p.estado === 'cerrado')

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Pedidos</h1>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Link href="/logistica" className="btn btn-secondary">📦 Lista de Armado</Link>
                    <Link href="/pedidos/nuevo" className="btn btn-primary">+ Nuevo Pedido</Link>
                </div>
            </div>

            <div className="page-body">
                <div className="kpi-grid" style={{ marginBottom: 20 }}>
                    <div className="kpi-card">
                        <div className="kpi-label">Pendientes</div>
                        <div className="kpi-value" style={{ color: 'var(--yellow)' }}>{pendientes.length}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Armados</div>
                        <div className="kpi-value" style={{ color: 'var(--blue)' }}>{armados.length}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Cerrados</div>
                        <div className="kpi-value" style={{ color: 'var(--green)' }}>{cerrados.length}</div>
                    </div>
                </div>

                <div className="table-container">
                    {pedidos.length === 0 ? (
                        <div className="empty-state">
                            <p>No hay pedidos. ¡Cargá el primero!</p>
                            <Link href="/pedidos/nuevo" className="btn btn-primary">Nuevo Pedido</Link>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>N° Pedido</th>
                                    <th>Cliente</th>
                                    <th>Artículos</th>
                                    <th>Fecha</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidos.map(p => {
                                    const badge = getEstadoBadge(p.estado)
                                    return (
                                        <tr key={p.id}>
                                            <td><strong>#{p.numero}</strong></td>
                                            <td>{p.cliente.nombre}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{p.items.length} ítem{p.items.length !== 1 ? 's' : ''}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{formatDate(p.createdAt)}</td>
                                            <td><strong>{formatCurrency(Number(p.total))}</strong></td>
                                            <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <Link href={`/pedidos/${p.id}`} className="btn btn-secondary btn-sm">Ver</Link>
                                                    <Link href={`/pedidos/${p.id}`} className="btn btn-primary btn-sm">Editar</Link>
                                                </div>
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
