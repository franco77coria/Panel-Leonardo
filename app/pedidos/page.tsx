'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate, getEstadoBadge } from '@/lib/utils'

interface Pedido {
    id: string
    numero: number
    estado: string
    total: number
    createdAt: string
    cliente: { nombre: string }
    items: { id: string }[]
}

const PAGE_SIZE = 50

export default function PedidosPage() {
    const [pedidos, setPedidos] = useState<Pedido[]>([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const [desde, setDesde] = useState('')
    const [hasta, setHasta] = useState('')
    const [estadoFilter, setEstadoFilter] = useState('')
    const [page, setPage] = useState(1)

    const fetchPedidos = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (busqueda) params.set('q', busqueda)
        if (desde) params.set('desde', desde)
        if (hasta) params.set('hasta', hasta)
        if (estadoFilter) params.set('estado', estadoFilter)
        const res = await fetch(`/api/pedidos?${params}`)
        const data = await res.json()
        setPedidos(Array.isArray(data) ? data : [])
        setLoading(false)
        setPage(1)
    }, [busqueda, desde, hasta, estadoFilter])

    useEffect(() => {
        fetchPedidos()
    }, [fetchPedidos])

    const pendientes = pedidos.filter(p => p.estado === 'pendiente')
    const armados = pedidos.filter(p => p.estado === 'armado')
    const cerrados = pedidos.filter(p => p.estado === 'cerrado')

    const totalPages = Math.ceil(pedidos.length / PAGE_SIZE)
    const pedidosPage = pedidos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Pedidos</h1>
                    <p className="page-subtitle">{pedidos.length} pedidos en total</p>
                </div>
                <div className="page-actions">
                    <Link href="/logistica" className="btn btn-secondary">Lista de Armado</Link>
                    <Link href="/pedidos/nuevo" className="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Nuevo Pedido
                    </Link>
                </div>
            </div>

            <div className="page-body">
                {/* Buscador */}
                <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Buscar por nombre o N° de pedido</label>
                            <input
                                type="text"
                                placeholder="Ej: Juan o 145..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                style={{ fontSize: 14 }}
                            />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Desde</label>
                            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Hasta</label>
                            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Estado</label>
                            <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} style={{ minWidth: 130 }}>
                                <option value="">Todos</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="armado">Armado</option>
                                <option value="cerrado">Cerrado</option>
                            </select>
                        </div>
                        {(busqueda || desde || hasta || estadoFilter) && (
                            <button className="btn btn-ghost btn-sm" onClick={() => { setBusqueda(''); setDesde(''); setHasta(''); setEstadoFilter('') }}>
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>

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
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando pedidos...</div>
                    ) : pedidos.length === 0 ? (
                        <div className="empty-state">
                            <p>No se encontraron pedidos.</p>
                            <Link href="/pedidos/nuevo" className="btn btn-primary">Nuevo Pedido</Link>
                        </div>
                    ) : (
                        <>
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
                                    {pedidosPage.map(p => {
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
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '16px 0' }}>
                                    <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Página {page} de {totalPages}</span>
                                    <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    )
}
