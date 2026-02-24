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

    // Top frecuentes (solo de pedidos cerrados)
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
                    <Link href="/clientes" style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none' }}>← Clientes</Link>
                    <h1 className="page-title" style={{ marginTop: 4 }}>{cliente.nombre}</h1>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Link href={`/pedidos/nuevo?clienteId=${id}`} className="btn btn-primary">Nuevo Pedido</Link>
                    <Link href={`/clientes/${id}/editar`} className="btn btn-secondary">Editar</Link>
                </div>
            </div>

            <div className="page-body">
                <div className="two-col" style={{ marginBottom: 20 }}>
                    {/* Info del cliente */}
                    <div className="card">
                        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Datos del Cliente</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Dirección:</span><br /><strong>{cliente.direccion || '-'}</strong></div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Teléfono:</span><br />
                                {cliente.telefono ? (
                                    <a href={`https://wa.me/54${cliente.telefono.replace(/\D/g, '')}`} target="_blank" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
                                        📱 {cliente.telefono}
                                    </a>
                                ) : <strong>-</strong>}
                            </div>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cliente desde:</span><br /><strong>{formatDate(cliente.createdAt)}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Total histórico comprado:</span><br /><strong style={{ fontSize: 20, color: 'var(--primary)' }}>{formatCurrency(totalHistorico)}</strong></div>
                        </div>
                    </div>

                    {/* Saldo editable */}
                    <div className="card">
                        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Cuenta Corriente</h2>
                        <div style={{ marginBottom: 16 }}>
                            <span className={`badge badge-${saldoInfo.color}`} style={{ fontSize: 16 }}>{saldoInfo.label}</span>
                        </div>
                        <ClienteSaldoEditor clienteId={id} saldoActual={Number(cliente.saldo)} />
                    </div>
                </div>

                <div className="two-col">
                    {/* Historial de pedidos */}
                    <div className="table-container">
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
                            Historial de Pedidos ({cliente.pedidos.length})
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
                                                <td>{formatDate(p.createdAt)}</td>
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

                    {/* Artículos frecuentes */}
                    <div className="table-container">
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
                            ⭐ Lo Que Compra Siempre (Top {frecuentes.length})
                        </div>
                        {frecuentes.length === 0 ? (
                            <div className="empty-state"><p>Sin historial de compras cerradas</p></div>
                        ) : (
                            <table>
                                <thead><tr><th>Artículo</th><th>Veces</th><th>Precio</th></tr></thead>
                                <tbody>
                                    {frecuentes.map(([id, data]) => (
                                        <tr key={id}>
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
