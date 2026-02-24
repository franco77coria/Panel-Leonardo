import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, getSaldoStatus } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
    const clientes = await prisma.cliente.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
    })

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Clientes</h1>
                    <p className="page-subtitle">{clientes.length} clientes activos</p>
                </div>
                <div className="page-actions">
                    <Link href="/clientes/nuevo" className="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Nuevo Cliente
                    </Link>
                </div>
            </div>

            <div className="page-body">
                <div className="kpi-grid" style={{ marginBottom: 20 }}>
                    <div className="kpi-card">
                        <div className="kpi-label">Total Clientes</div>
                        <div className="kpi-value">{clientes.length}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Con Deuda</div>
                        <div className="kpi-value" style={{ color: 'var(--red)' }}>{clientes.filter(c => Number(c.saldo) > 0).length}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Con Saldo a Favor</div>
                        <div className="kpi-value" style={{ color: 'var(--green)' }}>{clientes.filter(c => Number(c.saldo) < 0).length}</div>
                    </div>
                </div>

                <div className="table-container">
                    {clientes.length === 0 ? (
                        <div className="empty-state">
                            <p>No hay clientes aún.</p>
                            <Link href="/clientes/nuevo" className="btn btn-primary">Agregar Cliente</Link>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th className="hide-mobile">Dirección</th>
                                    <th className="hide-mobile">Teléfono</th>
                                    <th>Saldo</th>
                                    <th className="hide-mobile">Alta</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientes.map((c) => {
                                    const saldo = getSaldoStatus(Number(c.saldo))
                                    return (
                                        <tr key={c.id}>
                                            <td>
                                                <Link href={`/clientes/${c.id}`} style={{ fontWeight: 700, color: 'var(--primary-light)', textDecoration: 'none' }}>
                                                    {c.nombre}
                                                </Link>
                                            </td>
                                            <td className="hide-mobile" style={{ color: 'var(--text-muted)' }}>{c.direccion || '–'}</td>
                                            <td className="hide-mobile">
                                                {c.telefono ? (
                                                    <a href={`https://wa.me/54${c.telefono.replace(/\D/g, '')}`} target="_blank" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 500 }}>
                                                        {c.telefono}
                                                    </a>
                                                ) : '–'}
                                            </td>
                                            <td>
                                                <span className={`badge badge-${saldo.color}`}>{saldo.label}</span>
                                            </td>
                                            <td className="hide-mobile" style={{ color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <Link href={`/clientes/${c.id}`} className="btn btn-ghost btn-sm">Ver</Link>
                                                    <Link href={`/pedidos/nuevo?clienteId=${c.id}`} className="btn btn-primary btn-sm">Pedido</Link>
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
