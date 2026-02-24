import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, getEstadoBadge } from '@/lib/utils'
import Link from 'next/link'
import { ExportPedidosPDF, PrintButton } from '@/components/ExportPDF'

export const dynamic = 'force-dynamic'

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
                <div>
                    <h1 className="page-title">Pedidos</h1>
                    <p className="page-subtitle">{pedidos.length} pedidos en total</p>
                </div>
                <div className="page-actions">
                    <ExportPedidosPDF pedidos={pedidos.map(p => ({ numero: p.numero, clienteNombre: p.cliente.nombre, fecha: p.createdAt.toISOString(), total: Number(p.total), estado: p.estado, items: p.items.length }))} />
                    <PrintButton />
                    <Link href="/logistica" className="btn btn-secondary">Lista de Armado</Link>
                    <Link href="/pedidos/nuevo" className="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Nuevo Pedido
                    </Link>
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
                            <p>No hay pedidos.</p>
                            <Link href="/pedidos/nuevo" className="btn btn-primary">Nuevo Pedido</Link>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Cliente</th>
                                    <th className="hide-mobile">Ítems</th>
                                    <th className="hide-mobile">Fecha</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidos.map(p => {
                                    const badge = getEstadoBadge(p.estado)
                                    return (
                                        <tr key={p.id}>
                                            <td><strong>#{p.numero}</strong></td>
                                            <td>{p.cliente.nombre}</td>
                                            <td className="hide-mobile" style={{ color: 'var(--text-muted)' }}>{p.items.length}</td>
                                            <td className="hide-mobile" style={{ color: 'var(--text-muted)' }}>{formatDate(p.createdAt)}</td>
                                            <td><strong>{formatCurrency(Number(p.total))}</strong></td>
                                            <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                                            <td>
                                                <Link href={`/pedidos/${p.id}`} className="btn btn-ghost btn-sm">Ver</Link>
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
