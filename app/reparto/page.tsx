'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import jsPDF from 'jspdf'

interface Pedido {
    id: string
    numero: number
    estado: string
    total: number
    createdAt: string
    saldoAnterior: number
    cliente: { nombre: string; saldo: number }
}

export default function RepartoPage() {
    const [desde, setDesde] = useState('')
    const [hasta, setHasta] = useState('')
    const [pedidos, setPedidos] = useState<Pedido[]>([])
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [buscado, setBuscado] = useState(false)

    const buscar = async () => {
        if (!desde || !hasta) return alert('Seleccioná ambas fechas')
        setLoading(true)
        const res = await fetch(`/api/pedidos?desde=${desde}&hasta=${hasta}`)
        const data = await res.json()
        const arr = Array.isArray(data) ? data : []
        setPedidos(arr)
        setSeleccionados(new Set(arr.map((p: Pedido) => p.id)))
        setLoading(false)
        setBuscado(true)
    }

    const pedidosSel = pedidos.filter(p => seleccionados.has(p.id))
    const totalSubtotal = pedidosSel.reduce((s, p) => s + Number(p.total), 0)
    const totalSaldo = pedidosSel.reduce((s, p) => s + Number(p.saldoAnterior), 0)
    const totalGeneral = totalSubtotal + totalSaldo

    const toggleSel = (id: string) => {
        const next = new Set(seleccionados)
        next.has(id) ? next.delete(id) : next.add(id)
        setSeleccionados(next)
    }
    const toggleAll = () => {
        if (seleccionados.size === pedidos.length) setSeleccionados(new Set())
        else setSeleccionados(new Set(pedidos.map(p => p.id)))
    }

    const generarPDF = () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        let y = 20

        doc.setFontSize(20); doc.setFont('helvetica', 'bold')
        doc.text('PLANILLA DE REPARTO', 105, y, { align: 'center' }); y += 8
        doc.setFontSize(11); doc.setFont('helvetica', 'normal')
        const fmtLocal = (d: string) => d.split('-').reverse().join('/')
        doc.text(`Del ${fmtLocal(desde)} al ${fmtLocal(hasta)}`, 105, y, { align: 'center' }); y += 6
        doc.text(`${pedidosSel.length} pedidos`, 105, y, { align: 'center' }); y += 8
        doc.line(20, y, 190, y); y += 6

        // Table header
        doc.setFillColor(245, 246, 248)
        doc.rect(15, y - 4, 180, 8, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
        doc.text('FECHA', 17, y)
        doc.text('N°', 45, y)
        doc.text('CLIENTE', 58, y)
        doc.text('SUBTOTAL', 120, y)
        doc.text('SALDO ANT.', 148, y)
        doc.text('TOTAL', 178, y)
        y += 6; doc.line(15, y, 195, y); y += 5

        doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        for (const p of pedidosSel) {
            if (y > 265) { doc.addPage(); y = 20 }
            const subtotal = Number(p.total)
            const saldo = Number(p.saldoAnterior)
            doc.text(formatDate(p.createdAt), 17, y)
            doc.text(`#${p.numero}`, 45, y)
            doc.text(p.cliente.nombre.substring(0, 25), 58, y)
            doc.text(formatCurrency(subtotal), 120, y)
            doc.text(formatCurrency(saldo), 148, y)
            doc.setFont('helvetica', 'bold')
            doc.text(formatCurrency(subtotal + saldo), 178, y)
            doc.setFont('helvetica', 'normal')
            y += 6
        }

        // Totales
        y += 2; doc.setLineWidth(0.5); doc.line(15, y, 195, y); y += 7
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
        doc.text('TOTALES', 58, y)
        doc.text(formatCurrency(totalSubtotal), 120, y)
        doc.text(formatCurrency(totalSaldo), 148, y)
        doc.text(formatCurrency(totalGeneral), 178, y)

        window.open(doc.output('bloburl'), '_blank')
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Planilla de Reparto</h1>
                {buscado && pedidos.length > 0 && (
                    <button onClick={generarPDF} disabled={seleccionados.size === 0} className="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        Exportar PDF ({seleccionados.size})
                    </button>
                )}
            </div>

            <div className="page-body">
                {/* Filtros */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: 13, fontWeight: 600 }}>Desde</label>
                        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: 13, fontWeight: 600 }}>Hasta</label>
                        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
                    </div>
                    <button onClick={buscar} disabled={loading} className="btn btn-primary">
                        {loading ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>

                {/* Tabla */}
                {!buscado ? (
                    <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        Seleccioná un rango de fechas y hacé click en <strong>Buscar</strong>
                    </div>
                ) : pedidos.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No se encontraron pedidos en el rango seleccionado
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 36 }}><input type="checkbox" checked={seleccionados.size === pedidos.length} onChange={toggleAll} /></th>
                                    <th>Fecha</th>
                                    <th>N° Pedido</th>
                                    <th>Cliente</th>
                                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                                    <th style={{ textAlign: 'right' }}>Saldo Ant.</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidos.map(p => {
                                    const subtotal = Number(p.total)
                                    const saldo = Number(p.saldoAnterior)
                                    return (
                                        <tr key={p.id} style={{ opacity: seleccionados.has(p.id) ? 1 : 0.4 }}>
                                            <td><input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => toggleSel(p.id)} /></td>
                                            <td style={{ fontSize: 13 }}>{formatDate(p.createdAt)}</td>
                                            <td><strong>#{p.numero}</strong></td>
                                            <td>{p.cliente.nombre}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(subtotal)}</td>
                                            <td style={{ textAlign: 'right', color: saldo > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{formatCurrency(saldo)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(subtotal + saldo)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ fontWeight: 700 }}>
                                    <td colSpan={4} style={{ textAlign: 'right' }}>TOTALES ({seleccionados.size} seleccionados)</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(totalSubtotal)}</td>
                                    <td style={{ textAlign: 'right', color: totalSaldo > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{formatCurrency(totalSaldo)}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{formatCurrency(totalGeneral)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}
