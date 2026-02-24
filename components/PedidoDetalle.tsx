'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, formatDateTime, getSaldoStatus, getEstadoBadge } from '@/lib/utils'
import jsPDF from 'jspdf'

interface Articulo { id: string; nombre: string; precio: number; rubro?: { nombre: string } }
interface Item { id: string; articuloId: string; articulo: Articulo; cantidad: number; precioUnitario: number }
interface Cliente { id: string; nombre: string; direccion?: string; telefono?: string; saldo: number }
interface Pedido { id: string; numero: number; estado: string; total: number; notas?: string; saldoAnterior: number; createdAt: string; cerradoAt?: string; cliente: Cliente; items: Item[] }

export function PedidoDetalle({ pedido: initialPedido }: { pedido: Pedido }) {
    const router = useRouter()
    const [pedido, setPedido] = useState(initialPedido)
    const [editing, setEditing] = useState(false)
    const [items, setItems] = useState(initialPedido.items)
    const [loading, setLoading] = useState(false)
    const [articuloQuery, setArticuloQuery] = useState('')
    const [articuloResults, setArticuloResults] = useState<Articulo[]>([])

    const total = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
    const badge = getEstadoBadge(pedido.estado)
    const saldoInfo = getSaldoStatus(Number(pedido.cliente.saldo))

    const searchArticulos = async (q: string) => {
        if (!q) return setArticuloResults([])
        const res = await fetch(`/api/articulos?q=${q}`)
        setArticuloResults(await res.json())
    }

    const addItem = (a: Articulo) => {
        const exists = items.find(i => i.articuloId === a.id)
        if (exists) {
            setItems(items.map(i => i.articuloId === a.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        } else {
            setItems([...items, { id: `new-${a.id}`, articuloId: a.id, articulo: a, cantidad: 1, precioUnitario: Number(a.precio) }])
        }
        setArticuloQuery(''); setArticuloResults([])
    }

    const handleSave = async () => {
        setLoading(true)
        const res = await fetch(`/api/pedidos/${pedido.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: items.map(i => ({ articuloId: i.articuloId, cantidad: Number(i.cantidad), precioUnitario: Number(i.precioUnitario) })),
                estado: pedido.estado === 'pendiente' ? 'armado' : pedido.estado,
            }),
        })
        const updated = await res.json()
        setPedido(updated); setItems(updated.items)
        setLoading(false); setEditing(false)
    }

    const handleCerrar = async () => {
        if (!confirm(`¿Cerrar el pedido #${pedido.numero}? Esto actualizará la cuenta corriente de ${pedido.cliente.nombre}.`)) return
        setLoading(true)
        await fetch(`/api/pedidos/${pedido.id}/cerrar`, { method: 'POST' })
        setLoading(false)
        router.refresh()
        window.location.reload()
    }

    const handleEliminar = async () => {
        if (!confirm('¿Eliminar este pedido?')) return
        await fetch(`/api/pedidos/${pedido.id}`, { method: 'DELETE' })
        router.push('/pedidos')
    }

    const generarPDF = () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        const margin = 20
        let y = margin

        // Header
        doc.setFontSize(22); doc.setFont('helvetica', 'bold')
        doc.text('PRESUPUESTO', 105, y, { align: 'center' }); y += 10
        doc.setFontSize(13); doc.setFont('helvetica', 'normal')
        doc.text(`N° ${pedido.numero}`, 105, y, { align: 'center' }); y += 12

        doc.setDrawColor(200); doc.line(margin, y, 190, y); y += 8

        // Cliente info
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
        doc.text('CLIENTE', margin, y); y += 6
        doc.setFont('helvetica', 'normal'); doc.setFontSize(12)
        doc.text(pedido.cliente.nombre, margin, y); y += 6
        if (pedido.cliente.direccion) { doc.text(pedido.cliente.direccion, margin, y); y += 6 }
        if (pedido.cliente.telefono) { doc.text(`Tel: ${pedido.cliente.telefono}`, margin, y); y += 6 }
        doc.text(`Fecha: ${formatDate(pedido.createdAt)}`, margin, y); y += 10

        doc.setDrawColor(200); doc.line(margin, y, 190, y); y += 8

        // Saldo anterior
        if (Number(pedido.saldoAnterior) !== 0) {
            const saldoStr = Number(pedido.saldoAnterior) > 0
                ? `Saldo anterior (DEBE): ${formatCurrency(Number(pedido.saldoAnterior))}`
                : `Saldo anterior (A FAVOR): ${formatCurrency(Math.abs(Number(pedido.saldoAnterior)))}`
            doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
            doc.text(saldoStr, margin, y); y += 10
        }

        // Items table header
        doc.setFillColor(245, 246, 248)
        doc.rect(margin, y - 4, 170, 8, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
        doc.text('ARTÍCULO', margin + 2, y)
        doc.text('CANT.', 118, y)
        doc.text('P. UNIT.', 140, y)
        doc.text('SUBTOTAL', 168, y)
        y += 6; doc.setDrawColor(200); doc.line(margin, y, 190, y); y += 6

        // Items
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
        for (const item of items) {
            const subtotal = Number(item.cantidad) * Number(item.precioUnitario)
            doc.text(item.articulo.nombre.substring(0, 35), margin + 2, y)
            doc.text(String(item.cantidad), 118, y)
            doc.text(formatCurrency(Number(item.precioUnitario)), 140, y)
            doc.text(formatCurrency(subtotal), 168, y)
            y += 7
            if (y > 260) { doc.addPage(); y = margin }
        }

        y += 4; doc.setDrawColor(100); doc.setLineWidth(0.5); doc.line(margin, y, 190, y); y += 10
        doc.setLineWidth(0.2)

        // Total
        doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
        doc.text(`TOTAL: ${formatCurrency(total)}`, 190, y, { align: 'right' }); y += 12

        // Notas
        if (pedido.notas) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
            doc.text(`Notas: ${pedido.notas}`, margin, y)
        }

        doc.save(`pedido-${pedido.numero}-${pedido.cliente.nombre.replace(/\s+/g, '-')}.pdf`)
    }

    // SVG icon helpers (inline for cleanliness)
    const IconEdit = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
    const IconSave = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>
    const IconFile = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
    const IconCheck = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
    const IconTrash = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
    const IconX = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    const IconPhone = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>

    return (
        <>
            <div className="page-header no-print">
                <div>
                    <div className="breadcrumb">
                        <Link href="/pedidos">Pedidos</Link>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
                        <span>Pedido #{pedido.numero}</span>
                    </div>
                    <h1 className="page-title">Pedido #{pedido.numero}</h1>
                </div>
                <div className="page-actions">
                    <button onClick={generarPDF} className="btn btn-secondary">{IconFile} PDF</button>
                    {pedido.estado !== 'cerrado' && (
                        <>
                            {!editing && <button onClick={() => setEditing(true)} className="btn btn-secondary">{IconEdit} Editar</button>}
                            {editing && <button onClick={handleSave} disabled={loading} className="btn btn-primary">{IconSave} {loading ? 'Guardando...' : 'Guardar'}</button>}
                            {editing && <button onClick={() => { setEditing(false); setItems(initialPedido.items) }} className="btn btn-secondary">Cancelar</button>}
                            <button onClick={handleCerrar} disabled={loading} className="btn btn-danger">{IconCheck} Cerrar Pedido</button>
                        </>
                    )}
                    {pedido.estado === 'pendiente' && <button onClick={handleEliminar} className="btn btn-ghost" style={{ color: 'var(--red)' }}>{IconTrash} Eliminar</button>}
                </div>
            </div>

            <div className="page-body">
                <div className="two-col" style={{ marginBottom: 16 }}>
                    <div className="card">
                        <div className="card-header">Datos del Cliente</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Cliente</span>
                                <div><Link href={`/clientes/${pedido.cliente.id}`} style={{ fontWeight: 700, fontSize: 17, color: 'var(--primary-light)', textDecoration: 'none' }}>{pedido.cliente.nombre}</Link></div>
                            </div>
                            {pedido.cliente.direccion && (
                                <div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Dirección</span>
                                    <div style={{ fontWeight: 500 }}>{pedido.cliente.direccion}</div>
                                </div>
                            )}
                            {pedido.cliente.telefono && (
                                <div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Teléfono</span>
                                    <div>
                                        <a href={`https://wa.me/54${pedido.cliente.telefono.replace(/\D/g, '')}`} target="_blank" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            {IconPhone} {pedido.cliente.telefono}
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">Estado del Pedido</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Estado</span>
                                <div style={{ marginTop: 2 }}><span className={`badge ${badge.className}`}>{badge.label}</span></div>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Creado</span>
                                <div style={{ fontWeight: 500, marginTop: 2 }}>{formatDateTime(pedido.createdAt)}</div>
                            </div>
                            {pedido.cerradoAt && (
                                <div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Cerrado</span>
                                    <div style={{ fontWeight: 500, marginTop: 2 }}>{formatDateTime(pedido.cerradoAt)}</div>
                                </div>
                            )}
                            {Number(pedido.saldoAnterior) !== 0 && (
                                <div className={`alert alert-${Number(pedido.saldoAnterior) > 0 ? 'red' : 'green'}`} style={{ fontSize: 13 }}>
                                    Saldo al momento del pedido: <strong>{getSaldoStatus(Number(pedido.saldoAnterior)).label}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Article search in edit mode */}
                {editing && (
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">Agregar artículos</div>
                        <div style={{ position: 'relative' }}>
                            <input type="text" placeholder="Buscar artículo para agregar..." value={articuloQuery}
                                onChange={e => { setArticuloQuery(e.target.value); searchArticulos(e.target.value) }} />
                            {articuloResults.length > 0 && (
                                <div className="dropdown">
                                    {articuloResults.map(a => (
                                        <div key={a.id} className="dropdown-item" onClick={() => addItem(a)}>
                                            <span>{a.nombre}</span>
                                            <strong style={{ color: 'var(--primary-light)' }}>{formatCurrency(Number(a.precio))}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Artículo</th>
                                <th className="hide-mobile">Rubro</th>
                                <th style={{ width: 100 }}>Cant.</th>
                                <th className="hide-mobile">P. Unit.</th>
                                <th>Subtotal</th>
                                {editing && <th style={{ width: 40 }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id}>
                                    <td><strong>{item.articulo.nombre}</strong></td>
                                    <td className="hide-mobile" style={{ color: 'var(--text-muted)' }}>{item.articulo.rubro?.nombre || '–'}</td>
                                    <td>
                                        {editing ? (
                                            <input type="number" step="0.001" min="0"
                                                value={item.cantidad}
                                                onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, cantidad: parseFloat(e.target.value) || 0 } : i))}
                                                style={{ width: 80, padding: '5px 8px', fontWeight: 700, textAlign: 'center' }} />
                                        ) : <strong>{item.cantidad}</strong>}
                                    </td>
                                    <td className="hide-mobile">{formatCurrency(Number(item.precioUnitario))}</td>
                                    <td><strong>{formatCurrency(Number(item.cantidad) * Number(item.precioUnitario))}</strong></td>
                                    {editing && (
                                        <td>
                                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>
                                                {IconX}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={editing ? 4 : 3} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                                <td><strong style={{ fontSize: 20, color: 'var(--primary)' }}>{formatCurrency(total)}</strong></td>
                                {editing && <td></td>}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {pedido.notas && (
                    <div className="card" style={{ marginTop: 16 }}>
                        <div className="card-header">Notas</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{pedido.notas}</p>
                    </div>
                )}
            </div>
        </>
    )
}
