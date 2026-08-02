'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, formatDateTime, getSaldoStatus, getEstadoBadge, round2 } from '@/lib/utils'
import { renderBoletaEnDocumento } from '@/lib/pdf'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

const TELEFONO_LEO = '11 3808-8724'
const WA_LINK = 'https://wa.me/5491138088724'

interface Articulo { id: string; nombre: string; precio: number; costo?: number; rubro?: { nombre: string } }
interface Item { id: string; articuloId: string; articulo: Articulo; cantidad: number; precioUnitario: number; descuento: number; estadoItem?: string | null }
interface Cliente { id: string; nombre: string; direccion?: string; telefono?: string; saldo: number }
interface Pedido { id: string; numero: number; estado: string; total: number; notas?: string; saldoAnterior: number; createdAt: string; cerradoAt?: string; cliente: Cliente; items: Item[] }

export function PedidoDetalle({ pedido: initialPedido }: { pedido: Pedido }) {
    const router = useRouter()
    const [pedido, setPedido] = useState(initialPedido)
    const [editing, setEditing] = useState(false)
    const [items, setItems] = useState(initialPedido.items.map(i => ({ ...i, descuento: Number(i.descuento) || 0, estadoItem: i.estadoItem || '' })))
    const [estadoPedido, setEstadoPedido] = useState(initialPedido.estado)
    const [notasPedido, setNotasPedido] = useState(initialPedido.notas || '')
    const [loading, setLoading] = useState(false)
    const [articuloQuery, setArticuloQuery] = useState('')
    const [articuloResults, setArticuloResults] = useState<Articulo[]>([])
    const [listaPrecio, setListaPrecio] = useState<number>(1.20)
    const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null)
    const [editingPriceValue, setEditingPriceValue] = useState<string>('')

    const getPrecioBase = (a: Articulo) =>
        Number(a.costo) > 0 ? Number(a.costo) : Number(a.precio)

    const calcSubtotal = (item: typeof items[0]) => {
        const precio = Number(item.precioUnitario)
        const desc = Number(item.descuento) || 0
        const precioConDesc = round2(precio * (1 - desc / 100))
        return round2(Number(item.cantidad) * precioConDesc)
    }

    const subtotalGeneral = round2(items.reduce((s, i) => s + calcSubtotal(i), 0))
    const saldoAnterior = round2(pedido.saldoAnterior)
    const totalFinal = round2(subtotalGeneral + saldoAnterior)
    const badge = getEstadoBadge(pedido.estado)

    const searchArticulos = async (q: string) => {
        if (!q) return setArticuloResults([])
        try {
            const res = await fetch(`/api/articulos?q=${q}`)
            if (res.ok) setArticuloResults(await res.json())
        } catch { /* Error ignorado */ }
    }

    const addItem = (a: Articulo) => {
        const exists = items.find(i => i.articuloId === a.id)
        if (exists) {
            setItems(items.map(i => i.articuloId === a.id ? { ...i, cantidad: Number(i.cantidad) + 1 } : i))
        } else {
            setItems([{ id: `new-${a.id}`, articuloId: a.id, articulo: a, cantidad: 1, precioUnitario: round2(getPrecioBase(a) * listaPrecio), descuento: 0, estadoItem: '' }, ...items])
        }
        setArticuloQuery(''); setArticuloResults([])
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/pedidos/${pedido.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(i => ({ articuloId: i.articuloId, cantidad: Number(i.cantidad), precioUnitario: Number(i.precioUnitario), descuento: Number(i.descuento) || 0, estadoItem: i.estadoItem || null })),
                    estado: estadoPedido,
                    notas: notasPedido,
                }),
            })
            const updated = await res.json()
            if (!res.ok || !updated || !updated.items) {
                alert(updated?.error || 'Error al guardar los cambios del pedido.')
                setLoading(false)
                return
            }
            setPedido(updated)
            setEstadoPedido(updated.estado)
            setNotasPedido(updated.notas || '')
            setItems(updated.items.map((i: Item) => ({ ...i, descuento: Number(i.descuento) || 0, estadoItem: i.estadoItem || '' })))
            setEditing(false)
        } catch {
            alert('Error de conexión al guardar el pedido.')
        } finally {
            setLoading(false)
        }
    }

    const handleCerrar = async () => {
        if (!confirm(`¿Cerrar el pedido #${pedido.numero}? Esto actualizará la cuenta corriente de ${pedido.cliente.nombre}.`)) return
        setLoading(true)
        try {
            const res = await fetch(`/api/pedidos/${pedido.id}/cerrar`, { method: 'POST' })
            if (!res.ok) {
                const err = await res.json()
                alert(err?.error || 'Error al cerrar pedido.')
                setLoading(false)
                return
            }
            router.refresh(); window.location.reload()
        } catch {
            alert('Error al cerrar el pedido.')
            setLoading(false)
        }
    }

    const handleEliminar = async () => {
        if (!confirm('¿Eliminar este pedido?')) return
        try {
            const res = await fetch(`/api/pedidos/${pedido.id}`, { method: 'DELETE' })
            if (!res.ok) return alert('Error al eliminar el pedido.')
            router.push('/pedidos')
        } catch {
            alert('Error al eliminar el pedido.')
        }
    }

    const handleInlinePriceSave = async (itemId: string) => {
        const newPrice = parseFloat(editingPriceValue)
        if (isNaN(newPrice)) { setEditingPriceItemId(null); return }

        const originalItem = items.find(i => i.id === itemId)
        if (!originalItem || Number(originalItem.precioUnitario) === newPrice) { setEditingPriceItemId(null); return }

        const updatedItems = items.map(i => i.id === itemId ? { ...i, precioUnitario: newPrice } : i)
        setItems(updatedItems)
        setEditingPriceItemId(null)

        setLoading(true)
        try {
            const res = await fetch(`/api/pedidos/${pedido.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: updatedItems.map(i => ({ articuloId: i.articuloId, cantidad: Number(i.cantidad), precioUnitario: Number(i.precioUnitario), descuento: Number(i.descuento) || 0, estadoItem: i.estadoItem || null })),
                    estado: pedido.estado,
                    notas: pedido.notas,
                }),
            })
            const updated = await res.json()
            if (!res.ok || !updated || !updated.items) {
                alert(updated?.error || 'Error al guardar el precio.')
                setLoading(false)
                return
            }
            setPedido(updated)
            setItems(updated.items.map((i: Item) => ({ ...i, descuento: Number(i.descuento) || 0, estadoItem: i.estadoItem || '' })))
        } catch {
            alert('Error al guardar el precio.')
        } finally {
            setLoading(false)
        }
    }

    // ==================== PDF BOLETA ====================
    const generarPDF = async () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        let qrDataUrl = ''
        try {
            qrDataUrl = await QRCode.toDataURL(WA_LINK, { width: 200, margin: 1, color: { dark: '#1a2332', light: '#ffffff' } })
        } catch { /* QR error */ }

        await renderBoletaEnDocumento(doc, { ...pedido, items, notas: notasPedido }, qrDataUrl)
        window.open(doc.output('bloburl'), '_blank')
    }

    // ==================== SVG ICONS ====================
    const IconEdit = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
    const IconSave = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>
    const IconFile = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
    const IconCheck = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
    const IconTrash = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
    const IconX = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>

    return (
        <>
            <div className="page-header no-print">
                <div>
                    <div className="breadcrumb">
                        <Link href="/pedidos">Pedidos</Link>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
                        <span>#{pedido.numero}</span>
                    </div>
                    <h1 className="page-title">Presupuesto #{pedido.numero}</h1>
                </div>
                <div className="page-actions">
                    <button onClick={generarPDF} className="btn btn-secondary">{IconFile} PDF Boleta</button>
                    {pedido.estado !== 'cerrado' && (
                        <>
                            {!editing && <button onClick={() => setEditing(true)} className="btn btn-secondary">{IconEdit} Editar</button>}
                            {editing && <button onClick={handleSave} disabled={loading} className="btn btn-primary">{IconSave} {loading ? 'Guardando...' : 'Guardar'}</button>}
                            {editing && <button onClick={() => {
                                setEditing(false)
                                setEstadoPedido(pedido.estado)
                                setNotasPedido(pedido.notas || '')
                                setItems(initialPedido.items.map(i => ({ ...i, descuento: Number(i.descuento) || 0, estadoItem: i.estadoItem || '' })))
                            }} className="btn btn-secondary">Cancelar</button>}
                            <button onClick={handleCerrar} disabled={loading} className="btn btn-success">{IconCheck} Cerrar</button>
                        </>
                    )}
                    <button onClick={handleEliminar} className="btn btn-danger">{IconTrash} Eliminar</button>
                </div>
            </div>

            <div className="page-body">
                {/* Info cards */}
                <div className="two-col" style={{ marginBottom: 16 }}>
                    <div className="card">
                        <div className="card-header">Cliente</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                            <Link href={`/clientes/${pedido.cliente.id}`} style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>{pedido.cliente.nombre}</Link>
                        </div>
                        {pedido.cliente.direccion && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{pedido.cliente.direccion}</div>}
                    </div>
                    <div className="card">
                        <div className="card-header">Estado</div>
                        {editing ? (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <select value={estadoPedido} onChange={e => setEstadoPedido(e.target.value)} style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                                    <option value="pendiente">Pendiente de Armado</option>
                                    <option value="armado">Armado</option>
                                </select>
                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatDateTime(pedido.createdAt)}</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span className={`badge ${badge.className}`}>{badge.label}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatDateTime(pedido.createdAt)}</span>
                                {pedido.cerradoAt && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cerrado: {formatDateTime(pedido.cerradoAt)}</span>}
                            </div>
                        )}
                        {saldoAnterior !== 0 && (
                            <div className={`alert alert-${saldoAnterior > 0 ? 'red' : 'green'}`} style={{ fontSize: 13, marginTop: 8 }}>
                                Saldo al momento: <strong>{getSaldoStatus(saldoAnterior).label}</strong>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search for edit mode */}
                {editing && (
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header">Agregar artículos</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            <label style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Lista de precios:</label>
                            <select value={listaPrecio} onChange={e => setListaPrecio(Number(e.target.value))}
                                style={{ fontSize: 13, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 4 }}>
                                <option value={1.20}>Lista 1 (+20% sobre costo)</option>
                                <option value={1.25}>Lista 2 (+25% sobre costo)</option>
                                <option value={1.35}>Lista 3 (+35% sobre costo)</option>
                            </select>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input type="text" placeholder="Buscar artículo..." value={articuloQuery}
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

                {/* Items table */}
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>Cant.</th>
                                <th>Descripción</th>
                                <th style={{ width: 100 }}>Estado</th>
                                <th style={{ width: 110, textAlign: 'right' }}>P. Unitario</th>
                                <th style={{ width: 70, textAlign: 'center' }}>% Dto</th>
                                <th style={{ width: 110, textAlign: 'right' }}>P. c/Dto</th>
                                <th style={{ width: 120, textAlign: 'right' }}>Subtotal</th>
                                {editing && <th style={{ width: 40 }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const cant = Number(item.cantidad)
                                const precio = Number(item.precioUnitario)
                                const desc = Number(item.descuento) || 0
                                const precioConDesc = round2(precio * (1 - desc / 100))
                                const subtotal = calcSubtotal(item)

                                return (
                                    <tr key={item.id || idx}>
                                        <td>
                                            {editing ? (
                                                <input type="number" step="1" min="0.001" value={item.cantidad}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0
                                                        setItems(items.map((it, i) => i === idx ? { ...it, cantidad: val } : it))
                                                    }}
                                                    style={{ width: 60, padding: '4px 6px', fontSize: 13 }} />
                                            ) : (
                                                <strong>{cant}</strong>
                                            )}
                                        </td>
                                        <td>
                                            <strong>{item.articulo.nombre}</strong>
                                            {item.articulo.rubro && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>({item.articulo.rubro.nombre})</span>}
                                        </td>
                                        <td>
                                            {editing ? (
                                                <select
                                                    value={item.estadoItem || ''}
                                                    onChange={e => {
                                                        const val = e.target.value
                                                        setItems(items.map((it, i) => i === idx ? {
                                                            ...it,
                                                            estadoItem: val,
                                                            precioUnitario: val === 'Sin Cargo' ? 0 : it.precioUnitario
                                                        } : it))
                                                    }}
                                                    style={{ fontSize: 11, padding: '2px 4px' }}
                                                >
                                                    <option value="">Entregado</option>
                                                    <option value="Sin Cargo">Sin Cargo</option>
                                                    <option value="Falta Entregar">Falta Entregar</option>
                                                    <option value="Devolución">Devolución</option>
                                                </select>
                                            ) : (
                                                item.estadoItem ? <span className="badge badge-yellow" style={{ fontSize: 11 }}>{item.estadoItem}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {!editing && editingPriceItemId === item.id ? (
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingPriceValue}
                                                        onChange={e => setEditingPriceValue(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleInlinePriceSave(item.id); if (e.key === 'Escape') setEditingPriceItemId(null) }}
                                                        autoFocus
                                                        style={{ width: 80, padding: '2px 4px', fontSize: 12, textAlign: 'right' }}
                                                    />
                                                    <button onClick={() => handleInlinePriceSave(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', padding: 0 }} title="Guardar">{IconCheck}</button>
                                                    <button onClick={() => setEditingPriceItemId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }} title="Cancelar">{IconX}</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                                    <span>{formatCurrency(precio)}</span>
                                                    {!editing && pedido.estado !== 'cerrado' && (
                                                        <button
                                                            onClick={() => { setEditingPriceItemId(item.id); setEditingPriceValue(precio.toString()) }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center' }}
                                                            title="Editar precio unitario"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {editing ? (
                                                <input type="number" step="1" min="0" max="100" value={item.descuento}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0
                                                        setItems(items.map((it, i) => i === idx ? { ...it, descuento: val } : it))
                                                    }}
                                                    style={{ width: 50, padding: '4px 6px', fontSize: 13, textAlign: 'center' }} />
                                            ) : (
                                                desc > 0 ? <span className="badge badge-blue">{desc}%</span> : '—'
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>{desc > 0 ? formatCurrency(precioConDesc) : '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(subtotal)}</td>
                                        {editing && (
                                            <td>
                                                <button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}>&times;</button>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700 }}>SUBTOTAL</td>
                                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 16, color: 'var(--primary-light)' }}>{formatCurrency(subtotalGeneral)}</td>
                                {editing && <td></td>}
                            </tr>
                            {saldoAnterior !== 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'right', fontWeight: 600 }}>Saldo anterior ({saldoAnterior > 0 ? 'Debe' : 'A favor'})</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: saldoAnterior > 0 ? 'var(--red)' : 'var(--green)' }}>
                                        {saldoAnterior > 0 ? formatCurrency(saldoAnterior) : `-${formatCurrency(Math.abs(saldoAnterior))}`}
                                    </td>
                                    {editing && <td></td>}
                                </tr>
                            )}
                            <tr style={{ background: 'var(--bg-hover)' }}>
                                <td colSpan={6} style={{ textAlign: 'right', fontWeight: 800, fontSize: 15 }}>TOTAL FINAL</td>
                                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>{formatCurrency(totalFinal)}</td>
                                {editing && <td></td>}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Notas */}
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header">Notas del pedido</div>
                    {editing ? (
                        <textarea value={notasPedido} onChange={e => setNotasPedido(e.target.value)} rows={3} placeholder="Notas u observaciones..." style={{ width: '100%' }} />
                    ) : (
                        <p style={{ color: pedido.notas ? 'inherit' : 'var(--text-muted)', fontSize: 14 }}>{pedido.notas || 'Sin notas.'}</p>
                    )}
                </div>
            </div>
        </>
    )
}
