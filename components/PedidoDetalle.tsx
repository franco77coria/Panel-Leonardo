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
        doc.setFontSize(20); doc.setFont('helvetica', 'bold')
        doc.text('PRESUPUESTO', 105, y, { align: 'center' }); y += 8
        doc.setFontSize(12); doc.setFont('helvetica', 'normal')
        doc.text(`N° ${pedido.numero}`, 105, y, { align: 'center' }); y += 10

        doc.line(margin, y, 190, y); y += 6

        // Cliente
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
        doc.text('Cliente:', margin, y); y += 6
        doc.setFont('helvetica', 'normal'); doc.setFontSize(12)
        doc.text(pedido.cliente.nombre, margin, y); y += 5
        if (pedido.cliente.direccion) { doc.text(pedido.cliente.direccion, margin, y); y += 5 }
        if (pedido.cliente.telefono) { doc.text(`Tel: ${pedido.cliente.telefono}`, margin, y); y += 5 }
        doc.text(`Fecha: ${formatDate(pedido.createdAt)}`, margin, y); y += 10

        doc.line(margin, y, 190, y); y += 6

        // Saldo anterior
        if (Number(pedido.saldoAnterior) !== 0) {
            const saldoStr = Number(pedido.saldoAnterior) > 0
                ? `Saldo anterior (DEBE): ${formatCurrency(Number(pedido.saldoAnterior))}`
                : `Saldo anterior (A FAVOR): ${formatCurrency(Math.abs(Number(pedido.saldoAnterior)))}`
            doc.setFont('helvetica', 'bold')
            doc.text(saldoStr, margin, y); y += 8
        }

        // Items header
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
        doc.text('Artículo', margin, y)
        doc.text('Cant.', 120, y)
        doc.text('P. Unit.', 145, y)
        doc.text('Subtotal', 170, y)
        y += 5; doc.line(margin, y, 190, y); y += 5

        // Items
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
        for (const item of items) {
            const subtotal = Number(item.cantidad) * Number(item.precioUnitario)
            doc.text(item.articulo.nombre.substring(0, 35), margin, y)
            doc.text(String(item.cantidad), 120, y)
            doc.text(formatCurrency(Number(item.precioUnitario)), 145, y)
            doc.text(formatCurrency(subtotal), 170, y)
            y += 7
            if (y > 260) { doc.addPage(); y = margin }
        }

        y += 3; doc.line(margin, y, 190, y); y += 8

        // Total
        doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
        doc.text(`TOTAL: ${formatCurrency(total)}`, 190, y, { align: 'right' }); y += 10

        doc.save(`pedido-${pedido.numero}-${pedido.cliente.nombre.replace(/\s+/g, '-')}.pdf`)
    }

    return (
        <>
            <div className="page-header no-print">
                <div>
                    <Link href="/pedidos" style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none' }}>← Pedidos</Link>
                    <h1 className="page-title" style={{ marginTop: 4 }}>Pedido #{pedido.numero}</h1>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={generarPDF} className="btn btn-secondary">📄 PDF / WhatsApp</button>
                    {pedido.estado !== 'cerrado' && (
                        <>
                            {!editing && <button onClick={() => setEditing(true)} className="btn btn-secondary">✏️ Editar</button>}
                            {editing && <button onClick={handleSave} disabled={loading} className="btn btn-primary">{loading ? '...' : '💾 Guardar Cambios'}</button>}
                            {editing && <button onClick={() => { setEditing(false); setItems(initialPedido.items) }} className="btn btn-secondary">Cancelar</button>}
                            <button onClick={handleCerrar} disabled={loading} className="btn btn-danger">✅ Cerrar Pedido</button>
                        </>
                    )}
                    {pedido.estado === 'pendiente' && <button onClick={handleEliminar} className="btn btn-ghost" style={{ color: 'var(--red)' }}>🗑️ Eliminar</button>}
                </div>
            </div>

            <div className="page-body">
                <div className="two-col" style={{ marginBottom: 16 }}>
                    <div className="card">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cliente:</span><br /><Link href={`/clientes/${pedido.cliente.id}`} style={{ fontWeight: 700, fontSize: 18, color: 'var(--primary)', textDecoration: 'none' }}>{pedido.cliente.nombre}</Link></div>
                            {pedido.cliente.direccion && <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Dirección:</span><br />{pedido.cliente.direccion}</div>}
                            {pedido.cliente.telefono && <div><a href={`https://wa.me/54${pedido.cliente.telefono.replace(/\D/g, '')}`} target="_blank" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>📱 {pedido.cliente.telefono}</a></div>}
                        </div>
                    </div>
                    <div className="card">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div>Estado: <span className={`badge ${badge.className}`}>{badge.label}</span></div>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Creado:</span><br />{formatDateTime(pedido.createdAt)}</div>
                            {pedido.cerradoAt && <div><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cerrado:</span><br />{formatDateTime(pedido.cerradoAt)}</div>}
                            {Number(pedido.saldoAnterior) !== 0 && (
                                <div className={`alert alert-${Number(pedido.saldoAnterior) > 0 ? 'red' : 'green'}`} style={{ fontSize: 13 }}>
                                    Saldo al momento del pedido: <strong>{getSaldoStatus(Number(pedido.saldoAnterior)).label}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Buscador para agregar items en edición */}
                {editing && (
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div style={{ position: 'relative' }}>
                            <input type="text" placeholder="Buscar artículo para agregar..." value={articuloQuery}
                                onChange={e => { setArticuloQuery(e.target.value); searchArticulos(e.target.value) }} />
                            {articuloResults.length > 0 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 10, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    {articuloResults.map(a => (
                                        <div key={a.id} onClick={() => addItem(a)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                            <span>{a.nombre}</span>
                                            <strong>{formatCurrency(Number(a.precio))}</strong>
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
                                <th>Rubro</th>
                                <th style={{ width: 120 }}>Cantidad</th>
                                <th>Precio Unit.</th>
                                <th>Subtotal</th>
                                {editing && <th style={{ width: 40 }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id}>
                                    <td><strong>{item.articulo.nombre}</strong></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{item.articulo.rubro?.nombre || '-'}</td>
                                    <td>
                                        {editing ? (
                                            <input type="number" step="0.001" min="0"
                                                value={item.cantidad}
                                                onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, cantidad: parseFloat(e.target.value) || 0 } : i))}
                                                style={{ width: 100, padding: '6px 10px', fontWeight: 700 }} />
                                        ) : <strong>{item.cantidad}</strong>}
                                    </td>
                                    <td>{formatCurrency(Number(item.precioUnitario))}</td>
                                    <td><strong>{formatCurrency(Number(item.cantidad) * Number(item.precioUnitario))}</strong></td>
                                    {editing && (
                                        <td>
                                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>✕</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={editing ? 4 : 3} style={{ textAlign: 'right', fontWeight: 700, fontSize: 16 }}>TOTAL:</td>
                                <td><strong style={{ fontSize: 22, color: 'var(--primary)' }}>{formatCurrency(total)}</strong></td>
                                {editing && <td></td>}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {pedido.notas && (
                    <div className="card" style={{ marginTop: 16 }}>
                        <strong>Notas:</strong> {pedido.notas}
                    </div>
                )}
            </div>
        </>
    )
}
