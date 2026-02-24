import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, getSaldoStatus, getEstadoBadge } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClienteSaldoEditor } from '@/components/ClienteSaldoEditor'

export const dynamic = 'force-dynamic'

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cliente = await prisma.cliente.findUnique({
        where: { id },
        include: {
            pedidos: {
                orderBy: { createdAt: 'desc' },
                include: { items: { include: { articulo: { select: { nombre: true } } } } },
            },
            movimientosCC: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
    })

    if (!cliente) notFound()

    const saldoInfo = getSaldoStatus(Number(cliente.saldo))
    const totalHistorico = cliente.pedidos.filter(p => p.estado === 'cerrado').reduce((s, p) => s + Number(p.total), 0)

    const itemCounts: Record<string, { nombre: string; count: number; precio: number }> = {}
    for (const pedido of cliente.pedidos.filter(p => p.estado === 'cerrado')) {
        for (const item of pedido.items) {
            if (!itemCounts[item.articuloId]) {
                itemCounts[item.articuloId] = { nombre: item.articulo.nombre, count: 0, precio: Number(item.precioUnitario) }
            }
            itemCounts[item.articuloId].count++
        }
    }
    const frecuentes = Object.entries(itemCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 20)

    return (
        <>
            <div className="page-header">
                <div>
                    <div className="breadcrumb">
                        <Link href="/clientes">Clientes</Link>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
                        <span>{cliente.nombre}</span>
                    </div>
                    <h1 className="page-title">{cliente.nombre}</h1>
                </div>
                <div className="page-actions">
                    <Link href={`/pedidos/nuevo?clienteId=${id}`} className="btn btn-primary">Nuevo Pedido</Link>
                </div>
            </div>

            <div className="page-body">
                <div className="two-col" style={{ marginBottom: 20 }}>
                    <div className="card">
                        <div className="card-header">Datos del Cliente</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Dirección</span>
                                <div style={{ fontWeight: 600, marginTop: 2 }}>{cliente.direccion || '–'}</div>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Teléfono</span>
                                <div style={{ marginTop: 2 }}>
                                    {cliente.telefono ? (
                                        <a href={`https://wa.me/54${cliente.telefono.replace(/\D/g, '')}`} target="_blank" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
                                            {cliente.telefono}
                                        </a>
                                    ) : <span style={{ fontWeight: 600 }}>–</span>}
                                </div>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Cliente desde</span>
                                <div style={{ fontWeight: 600, marginTop: 2 }}>{formatDate(cliente.createdAt)}</div>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total histórico</span>
                                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-light)', marginTop: 2 }}>{formatCurrency(totalHistorico)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">Cuenta Corriente</div>
                        <div style={{ marginBottom: 16 }}>
                            <span className={`badge badge-${saldoInfo.color}`} style={{ fontSize: 14, padding: '5px 12px' }}>{saldoInfo.label}</span>
                        </div>
                        <ClienteSaldoEditor clienteId={id} saldoActual={Number(cliente.saldo)} />
                    </div>
                </div>

                <div className="two-col">
                    <div className="table-container">
                        <div className="table-header">
                            <span className="table-title">Historial de Pedidos ({cliente.pedidos.length})</span>
                        </div>
                        {cliente.pedidos.length === 0 ? (
                            <div className="empty-state"><p>Sin pedidos aún</p></div>
                        ) : (
                            <table>
                                <thead><tr><th>N°</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead>
                                <tbody>
                                    {cliente.pedidos.map(p => {
                                        const badge = getEstadoBadge(p.estado)
                                        return (
                                            <tr key={p.id}>
                                                <td><strong>#{p.numero}</strong></td>
                                                <td className="hide-mobile">{formatDate(p.createdAt)}</td>
                                                <td><strong>{formatCurrency(Number(p.total))}</strong></td>
                                                <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                                                <td><Link href={`/pedidos/${p.id}`} className="btn btn-ghost btn-sm">Ver</Link></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <span className="table-title">Frecuentes (Top {frecuentes.length})</span>
                        </div>
                        {frecuentes.length === 0 ? (
                            <div className="empty-state"><p>Sin historial de compras cerradas</p></div>
                        ) : (
                            <table>
                                <thead><tr><th>Artículo</th><th>Veces</th><th>Precio</th></tr></thead>
                                <tbody>
                                    {frecuentes.map(([artId, data]) => (
                                        <tr key={artId}>
                                            <td>{data.nombre}</td>
                                            <td><span className="badge badge-blue">{data.count}x</span></td>
                                            <td>{formatCurrency(data.precio)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
