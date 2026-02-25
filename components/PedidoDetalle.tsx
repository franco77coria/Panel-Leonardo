'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, formatDateTime, getSaldoStatus, getEstadoBadge } from '@/lib/utils'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

// Config - teléfono de Leo
const TELEFONO_LEO = '11 3808-8724'
const WA_LINK = 'https://wa.me/5491138088724'

interface Articulo { id: string; nombre: string; precio: number; rubro?: { nombre: string } }
interface Item { id: string; articuloId: string; articulo: Articulo; cantidad: number; precioUnitario: number; descuento: number; estadoItem?: string | null }
interface Cliente { id: string; nombre: string; direccion?: string; telefono?: string; saldo: number }
interface Pedido { id: string; numero: number; estado: string; total: number; notas?: string; saldoAnterior: number; createdAt: string; cerradoAt?: string; cliente: Cliente; items: Item[] }

export function PedidoDetalle({ pedido: initialPedido }: { pedido: Pedido }) {
    const router = useRouter()
    const [pedido, setPedido] = useState(initialPedido)
    const [editing, setEditing] = useState(false)
    const [items, setItems] = useState(initialPedido.items.map(i => ({ ...i, descuento: Number(i.descuento) || 0, estadoItem: i.estadoItem || '' })))
    const [loading, setLoading] = useState(false)
    const [articuloQuery, setArticuloQuery] = useState('')
    const [articuloResults, setArticuloResults] = useState<Articulo[]>([])

    const calcSubtotal = (item: typeof items[0]) => {
        const precio = Number(item.precioUnitario)
        const desc = Number(item.descuento) || 0
        const precioConDesc = precio * (1 - desc / 100)
        return Number(item.cantidad) * precioConDesc
    }

    const subtotalGeneral = items.reduce((s, i) => s + calcSubtotal(i), 0)
    const saldoAnterior = Number(pedido.saldoAnterior) || 0
    const totalFinal = subtotalGeneral + (saldoAnterior > 0 ? saldoAnterior : 0)
    const badge = getEstadoBadge(pedido.estado)

    const searchArticulos = async (q: string) => {
        if (!q) return setArticuloResults([])
        const res = await fetch(`/api/articulos?q=${q}`)
        setArticuloResults(await res.json())
    }

    const addItem = (a: Articulo) => {
        const exists = items.find(i => i.articuloId === a.id)
        if (exists) {
            setItems(items.map(i => i.articuloId === a.id ? { ...i, cantidad: Number(i.cantidad) + 1 } : i))
        } else {
            setItems([...items, { id: `new-${a.id}`, articuloId: a.id, articulo: a, cantidad: 1, precioUnitario: Number(a.precio), descuento: 0, estadoItem: '' }])
        }
        setArticuloQuery(''); setArticuloResults([])
    }

    const handleSave = async () => {
        setLoading(true)
        const res = await fetch(`/api/pedidos/${pedido.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: items.map(i => ({ articuloId: i.articuloId, cantidad: Number(i.cantidad), precioUnitario: Number(i.precioUnitario), descuento: Number(i.descuento) || 0, estadoItem: i.estadoItem || null })),
                estado: pedido.estado === 'pendiente' ? 'armado' : pedido.estado,
            }),
        })
        const updated = await res.json()
        setPedido(updated)
        setItems(updated.items.map((i: Item) => ({ ...i, descuento: Number(i.descuento) || 0, estadoItem: i.estadoItem || '' })))
        setLoading(false); setEditing(false)
    }

    const handleCerrar = async () => {
        if (!confirm(`¿Cerrar el pedido #${pedido.numero}? Esto actualizará la cuenta corriente de ${pedido.cliente.nombre}.`)) return
        setLoading(true)
        await fetch(`/api/pedidos/${pedido.id}/cerrar`, { method: 'POST' })
        setLoading(false); router.refresh(); window.location.reload()
    }

    const handleEliminar = async () => {
        if (!confirm('¿Eliminar este pedido?')) return
        await fetch(`/api/pedidos/${pedido.id}`, { method: 'DELETE' })
        router.push('/pedidos')
    }

    // ==================== PDF BOLETA ====================
    const generarPDF = async () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        const pw = 210, margin = 12
        const cw = pw - 2 * margin // content width
        let y = margin

        // ---------- QR Code WhatsApp ----------
        let qrDataUrl = ''
        try {
            qrDataUrl = await QRCode.toDataURL(WA_LINK, { width: 200, margin: 1, color: { dark: '#1a2332', light: '#ffffff' } })
        } catch { /* QR error */ }

        // ---------- HEADER: Logo + Info + QR ----------
        try {
            doc.addImage('/logo.png', 'JPEG', margin, y, 40, 20)
        } catch { /* logo no disponible */ }

        // PAPELERA - grande y bold
        doc.setFontSize(26); doc.setFont('helvetica', 'bold')
        doc.text('Papelera', margin + 44, y + 8)

        // Leo + teléfono con icono WA
        doc.setFontSize(14); doc.setFont('helvetica', 'normal')
        doc.text('Leo', margin + 44, y + 16)
        doc.setFontSize(10)
        doc.text(TELEFONO_LEO, margin + 56, y + 16)

        // QR a la derecha
        if (qrDataUrl) {
            doc.addImage(qrDataUrl, 'PNG', pw - margin - 22, y, 22, 22)
            doc.setFontSize(6); doc.setFont('helvetica', 'normal')
            doc.text('WhatsApp', pw - margin - 11, y + 24, { align: 'center' })
        }

        // ---------- Rectángulo superior dividido en 3 ----------
        y += 26
        const boxH = 14
        const col1W = cw * 0.4, col2W = cw * 0.3, col3W = cw * 0.3

        // Box 1: "X" Documento no válido como factura
        doc.setDrawColor(0); doc.setLineWidth(0.3)
        doc.rect(margin, y, col1W, boxH)
        doc.setFontSize(16); doc.setFont('helvetica', 'bold')
        doc.text('X', margin + 4, y + 6)
        doc.setFontSize(7); doc.setFont('helvetica', 'normal')
        doc.text('Documento no válido', margin + 12, y + 5)
        doc.text('como factura', margin + 12, y + 9)

        // Box 2: Número del pedido - grande
        doc.rect(margin + col1W, y, col2W, boxH)
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        doc.text('PRESUPUESTO N°', margin + col1W + 3, y + 5)
        doc.setFontSize(18); doc.setFont('helvetica', 'bold')
        doc.text(String(pedido.numero).padStart(6, '0'), margin + col1W + 3, y + 12)

        // Box 3: Fecha y hora
        const fechaEmision = new Date(pedido.createdAt)
        doc.rect(margin + col1W + col2W, y, col3W, boxH)
        doc.setFontSize(8); doc.setFont('helvetica', 'normal')
        doc.text('Fecha:', margin + col1W + col2W + 3, y + 5)
        doc.setFont('helvetica', 'bold')
        doc.text(fechaEmision.toLocaleDateString('es-AR'), margin + col1W + col2W + 15, y + 5)
        doc.setFont('helvetica', 'normal')
        doc.text('Hora:', margin + col1W + col2W + 3, y + 10)
        doc.setFont('helvetica', 'bold')
        doc.text(fechaEmision.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), margin + col1W + col2W + 15, y + 10)

        // ---------- CLIENTE ----------
        y += boxH + 4
        doc.setFillColor(245, 246, 248)
        doc.rect(margin, y, cw, 10, 'F')
        doc.rect(margin, y, cw, 10)
        doc.setFontSize(10); doc.setFont('helvetica', 'bold')
        doc.text('CLIENTE:', margin + 3, y + 7)
        doc.setFontSize(14)
        doc.text(pedido.cliente.nombre, margin + 28, y + 7)

        // ---------- TABLA DE ITEMS ----------
        y += 14
        const cols = [
            { label: 'Cant.', w: 14, align: 'center' as const },
            { label: 'Descripción', w: 60, align: 'left' as const },
            { label: 'Estado', w: 22, align: 'center' as const },
            { label: 'P. Unit.', w: 22, align: 'right' as const },
            { label: '% Dto.', w: 14, align: 'center' as const },
            { label: 'P. c/Dto.', w: 24, align: 'right' as const },
            { label: 'Subtotal', w: 28, align: 'right' as const },
        ]
        const totalColW = cols.reduce((s, c) => s + c.w, 0)

        // Header de tabla
        doc.setFillColor(50, 50, 60)
        doc.rect(margin, y, totalColW, 7, 'F')
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255)
        let cx = margin
        for (const col of cols) {
            const tx = col.align === 'right' ? cx + col.w - 2 : col.align === 'center' ? cx + col.w / 2 : cx + 2
            doc.text(col.label, tx, y + 5, { align: col.align === 'left' ? undefined : col.align })
            cx += col.w
        }
        doc.setTextColor(0)
        y += 7

        // Rows
        doc.setFontSize(8); doc.setFont('helvetica', 'normal')
        let rowNum = 0
        for (const item of items) {
            if (y > 255) { doc.addPage(); y = margin }

            const cant = Number(item.cantidad)
            const precio = Number(item.precioUnitario)
            const desc = Number(item.descuento) || 0
            const precioConDesc = precio * (1 - desc / 100)
            const subtotal = cant * precioConDesc

            // Zebra stripe
            if (rowNum % 2 === 0) {
                doc.setFillColor(250, 250, 252)
                doc.rect(margin, y, totalColW, 6, 'F')
            }
            doc.rect(margin, y, totalColW, 6)

            cx = margin
            // Cantidad
            doc.text(String(cant), cx + cols[0].w / 2, y + 4.5, { align: 'center' })
            cx += cols[0].w
            // Descripción
            doc.setFont('helvetica', 'bold')
            doc.text(item.articulo.nombre.substring(0, 32), cx + 2, y + 4.5)
            doc.setFont('helvetica', 'normal')
            cx += cols[1].w
            // Estado
            if (item.estadoItem) {
                doc.setFontSize(7)
                doc.text(item.estadoItem.substring(0, 12), cx + cols[2].w / 2, y + 4.5, { align: 'center' })
                doc.setFontSize(8)
            }
            cx += cols[2].w
            // Precio unitario
            doc.text(formatCurrency(precio), cx + cols[3].w - 2, y + 4.5, { align: 'right' })
            cx += cols[3].w
            // % Descuento
            if (desc > 0) {
                doc.text(`${desc}%`, cx + cols[4].w / 2, y + 4.5, { align: 'center' })
            }
            cx += cols[4].w
            // Precio con descuento
            if (desc > 0) {
                doc.text(formatCurrency(precioConDesc), cx + cols[5].w - 2, y + 4.5, { align: 'right' })
            } else {
                doc.text('-', cx + cols[5].w / 2, y + 4.5, { align: 'center' })
            }
            cx += cols[5].w
            // Subtotal
            doc.setFont('helvetica', 'bold')
            doc.text(formatCurrency(subtotal), cx + cols[6].w - 2, y + 4.5, { align: 'right' })
            doc.setFont('helvetica', 'normal')

            y += 6
            rowNum++
        }

        // ---------- FOOTER: Subtotal / Saldo / TOTAL ----------
        y += 2
        const footerX = margin + totalColW - 60

        // Subtotal general
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        doc.text('SUBTOTAL:', footerX, y + 5)
        doc.setFont('helvetica', 'bold')
        doc.text(formatCurrency(subtotalGeneral), margin + totalColW - 2, y + 5, { align: 'right' })

        // Saldo anterior
        y += 6
        doc.setFont('helvetica', 'normal')
        doc.text('SALDO:', footerX, y + 5)
        doc.setFont('helvetica', 'bold')
        if (saldoAnterior > 0) {
            doc.setTextColor(220, 38, 38)
        }
        doc.text(formatCurrency(saldoAnterior), margin + totalColW - 2, y + 5, { align: 'right' })
        doc.setTextColor(0)

        // TOTAL - grande y destacado
        y += 8
        doc.setFillColor(50, 50, 60)
        doc.rect(footerX - 2, y, 62, 10, 'F')
        doc.setTextColor(255)
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('TOTAL:', footerX + 2, y + 7)
        doc.setFontSize(14)
        doc.text(formatCurrency(totalFinal), margin + totalColW - 2, y + 7, { align: 'right' })
        doc.setTextColor(0)

        // Notas
        if (pedido.notas) {
            y += 14
            doc.setFontSize(8); doc.setFont('helvetica', 'normal')
            doc.text(`Notas: ${pedido.notas}`, margin, y)
        }

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
                            {editing && <button onClick={() => { setEditing(false); setItems(initialPedido.items.map(i => ({ ...i, descuento: Number(i.descuento) || 0, estadoItem: i.estadoItem || '' }))) }} className="btn btn-secondary">Cancelar</button>}
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
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className={`badge ${badge.className}`}>{badge.label}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatDateTime(pedido.createdAt)}</span>
                            {pedido.cerradoAt && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cerrado: {formatDateTime(pedido.cerradoAt)}</span>}
                        </div>
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
                                <th className="hide-mobile">P. Unit.</th>
                                <th style={{ width: 65 }}>% Dto.</th>
                                <th className="hide-mobile">P. c/Dto.</th>
                                <th>Subtotal</th>
                                {editing && <th style={{ width: 36 }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => {
                                const precio = Number(item.precioUnitario)
                                const desc = Number(item.descuento) || 0
                                const precioConDesc = precio * (1 - desc / 100)
                                const sub = calcSubtotal(item)
                                return (
                                    <tr key={item.id}>
                                        <td>
                                            {editing ? (
                                                <input type="number" step="0.001" value={item.cantidad}
                                                    onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, cantidad: parseFloat(e.target.value) || 0 } : i))}
                                                    style={{ width: 55, padding: '4px 6px', fontWeight: 700, textAlign: 'center', color: item.cantidad < 0 ? 'var(--red)' : 'inherit' }} />
                                            ) : <strong style={{ color: item.cantidad < 0 ? 'var(--red)' : 'inherit' }}>{Number(item.cantidad)}</strong>}
                                        </td>
                                        <td><strong>{item.articulo.nombre}</strong></td>
                                        <td>
                                            {editing ? (
                                                <select
                                                    value={item.estadoItem || 'Entregado'}
                                                    onChange={e => {
                                                        const nuevoEstado = e.target.value
                                                        let nuevaCant = item.cantidad
                                                        if (nuevoEstado === 'Devolución' && nuevaCant > 0) nuevaCant = -nuevaCant
                                                        if (nuevoEstado !== 'Devolución' && nuevaCant < 0) nuevaCant = Math.abs(nuevaCant)
                                                        setItems(items.map(i => i.id === item.id ? { ...i, estadoItem: nuevoEstado, cantidad: nuevaCant } : i))
                                                    }}
                                                    style={{ width: 95, padding: '4px 6px', fontSize: 12, border: '1px solid var(--border)' }}
                                                >
                                                    <option value="Entregado">Entregado</option>
                                                    <option value="Cambio">Cambio</option>
                                                    <option value="Devolución">Devolución</option>
                                                </select>
                                            ) : (
                                                item.estadoItem ? <span className="badge badge-gray" style={{ fontSize: 11 }}>{item.estadoItem}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td className="hide-mobile">
                                            {editing ? (
                                                <input type="number" step="0.01" value={item.precioUnitario}
                                                    onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, precioUnitario: parseFloat(e.target.value) || 0 } : i))}
                                                    style={{ width: 75, padding: '4px 6px', fontSize: 12, textAlign: 'right' }} />
                                            ) : (
                                                formatCurrency(precio)
                                            )}
                                        </td>
                                        <td>
                                            {editing ? (
                                                <input type="number" step="1" min="0" max="100" value={item.descuento}
                                                    onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, descuento: parseFloat(e.target.value) || 0 } : i))}
                                                    style={{ width: 50, padding: '4px 6px', textAlign: 'center' }} />
                                            ) : (
                                                desc > 0 ? <span className="badge badge-green" style={{ fontSize: 11 }}>{desc}%</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td className="hide-mobile">
                                            {desc > 0 ? <span style={{ color: 'var(--green)' }}>{formatCurrency(precioConDesc)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        <td><strong>{formatCurrency(sub)}</strong></td>
                                        {editing && (
                                            <td>
                                                <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>{IconX}</button>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={editing ? 6 : 5} style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>SUBTOTAL</td>
                                <td><strong>{formatCurrency(subtotalGeneral)}</strong></td>
                                {editing && <td></td>}
                            </tr>
                            {saldoAnterior !== 0 && (
                                <tr>
                                    <td colSpan={editing ? 6 : 5} style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: saldoAnterior > 0 ? 'var(--red)' : 'var(--green)' }}>SALDO</td>
                                    <td style={{ color: saldoAnterior > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{formatCurrency(saldoAnterior)}</td>
                                    {editing && <td></td>}
                                </tr>
                            )}
                            <tr style={{ background: 'var(--primary)', color: 'white' }}>
                                <td colSpan={editing ? 6 : 5} style={{ textAlign: 'right', fontWeight: 800, fontSize: 16 }}>TOTAL</td>
                                <td><strong style={{ fontSize: 20 }}>{formatCurrency(totalFinal)}</strong></td>
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
