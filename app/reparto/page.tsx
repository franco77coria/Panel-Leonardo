'use client'

import { useState } from 'react'
import { formatCurrency, formatDate, round2 } from '@/lib/utils'
import { generarBoletasLotePDF } from '@/lib/pdf'
import jsPDF from 'jspdf'

interface Pedido {
    id: string
    numero: number
    estado: string
    total: number
    createdAt: string
    saldoAnterior: number
    notas?: string
    cliente: { nombre: string; saldo: number }
    items: any[]
}

export default function RepartoPage() {
    const [desde, setDesde] = useState('')
    const [hasta, setHasta] = useState('')
    const [pedidos, setPedidos] = useState<Pedido[]>([])
    const [seleccionados, setSeleccionados] = useState<string[]>([]) // Array for ordered selection
    const [loading, setLoading] = useState(false)
    const [buscado, setBuscado] = useState(false)

    const buscar = async () => {
        if (!desde || !hasta) return alert('Seleccioná ambas fechas')
        setLoading(true)
        try {
            const res = await fetch(`/api/pedidos?desde=${desde}&hasta=${hasta}`)
            if (!res.ok) throw new Error('API error')
            const data = await res.json()
            const arr = Array.isArray(data) ? data : []
            setPedidos(arr)
            setSeleccionados(arr.map((p: Pedido) => p.id))
            setBuscado(true)
        } catch {
            alert('Error al buscar pedidos para reparto.')
        } finally {
            setLoading(false)
        }
    }

    const selSet = new Set(seleccionados)
    const pedidosSel = seleccionados.map(id => pedidos.find(p => p.id === id)!).filter(Boolean)
    const totalSubtotal = round2(pedidosSel.reduce((s, p) => s + Number(p.total), 0))
    const totalSaldo = round2(pedidosSel.reduce((s, p) => s + Number(p.saldoAnterior), 0))
    const totalGeneral = round2(totalSubtotal + totalSaldo)

    const toggleSel = (id: string) => {
        if (selSet.has(id)) {
            setSeleccionados(seleccionados.filter(x => x !== id))
        } else {
            setSeleccionados([...seleccionados, id])
        }
    }
    const toggleAll = () => {
        if (seleccionados.length === pedidos.length) setSeleccionados([])
        else setSeleccionados(pedidos.map(p => p.id))
    }

    const getOrden = (id: string): number => {
        const idx = seleccionados.indexOf(id)
        return idx >= 0 ? idx + 1 : 0
    }

    const generarPDFPlanilla = () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })

        const drawTitleAndHeader = () => {
            let y = 20
            doc.setFontSize(20); doc.setFont('helvetica', 'bold')
            doc.text('PLANILLA DE REPARTO', 105, y, { align: 'center' }); y += 8
            doc.setFontSize(11); doc.setFont('helvetica', 'normal')
            const fmtLocal = (d: string) => d.split('-').reverse().join('/')
            doc.text(`Del ${fmtLocal(desde)} al ${fmtLocal(hasta)}`, 105, y, { align: 'center' }); y += 6
            doc.text(`${pedidosSel.length} pedidos`, 105, y, { align: 'center' }); y += 8
            doc.line(15, y, 195, y); y += 6

            doc.setFillColor(245, 246, 248)
            doc.rect(15, y - 4, 180, 8, 'F')
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
            doc.text('#', 17, y)
            doc.text('FECHA', 24, y)
            doc.text('N°', 48, y)
            doc.text('CLIENTE', 61, y)
            doc.text('SUBTOTAL', 140, y, { align: 'right' })
            doc.text('SALDO ANT.', 168, y, { align: 'right' })
            doc.text('TOTAL', 193, y, { align: 'right' })
            y += 6; doc.line(15, y, 195, y); y += 5
            return y
        }

        let y = drawTitleAndHeader()
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        let orden = 1

        for (const p of pedidosSel) {
            if (y > 260) {
                doc.addPage()
                y = drawTitleAndHeader()
            }
            const subtotal = round2(Number(p.total))
            const saldo = round2(Number(p.saldoAnterior))
            const totalF = round2(subtotal + saldo)

            doc.setFont('helvetica', 'bold')
            doc.text(`${orden}°`, 17, y)
            doc.setFont('helvetica', 'normal')
            doc.text(formatDate(p.createdAt), 24, y)
            doc.text(`#${p.numero}`, 48, y)
            doc.text((p.cliente?.nombre || '—').substring(0, 32), 61, y)

            doc.text(formatCurrency(subtotal), 140, y, { align: 'right' })
            doc.text(formatCurrency(saldo), 168, y, { align: 'right' })

            doc.setFont('helvetica', 'bold')
            doc.text(formatCurrency(totalF), 193, y, { align: 'right' })
            doc.setFont('helvetica', 'normal')

            y += 6
            orden++
        }

        if (y > 255) {
            doc.addPage()
            y = drawTitleAndHeader()
        }

        y += 2; doc.setLineWidth(0.5); doc.line(15, y, 195, y); y += 7
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
        doc.text('TOTALES', 61, y)
        doc.text(formatCurrency(totalSubtotal), 140, y, { align: 'right' })
        doc.text(formatCurrency(totalSaldo), 168, y, { align: 'right' })
        doc.text(formatCurrency(totalGeneral), 193, y, { align: 'right' })

        window.open(doc.output('bloburl'), '_blank')
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Planilla de Reparto</h1>
                {buscado && pedidos.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button onClick={() => generarBoletasLotePDF(pedidosSel)} disabled={seleccionados.length === 0} className="btn btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            Imprimir Boletas Reparto ({seleccionados.length})
                        </button>
                        <button onClick={generarPDFPlanilla} disabled={seleccionados.length === 0} className="btn btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            Exportar Planilla PDF ({seleccionados.length})
                        </button>
                    </div>
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
                    <>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                            💡 El orden en que seleccionás los pedidos es el orden que va a tener la planilla impresa y el archivo de boletas
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: 36 }}><input type="checkbox" checked={pedidos.length > 0 && seleccionados.length === pedidos.length} onChange={toggleAll} /></th>
                                        <th style={{ width: 40 }}>Orden</th>
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
                                        const subtotal = round2(Number(p.total))
                                        const saldo = round2(Number(p.saldoAnterior))
                                        const orden = getOrden(p.id)
                                        return (
                                            <tr key={p.id} style={{ opacity: selSet.has(p.id) ? 1 : 0.4 }}>
                                                <td><input type="checkbox" checked={selSet.has(p.id)} onChange={() => toggleSel(p.id)} /></td>
                                                <td>
                                                    {orden > 0 && (
                                                        <span className="badge badge-blue" style={{ fontSize: 11, fontWeight: 700 }}>{orden}°</span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: 13 }}>{formatDate(p.createdAt)}</td>
                                                <td><strong>#{p.numero}</strong></td>
                                                <td>{p.cliente?.nombre || '—'}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(subtotal)}</td>
                                                <td style={{ textAlign: 'right', color: saldo > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{formatCurrency(saldo)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(subtotal + saldo)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{ fontWeight: 700 }}>
                                        <td colSpan={5} style={{ textAlign: 'right' }}>TOTALES ({seleccionados.length} seleccionados)</td>
                                        <td style={{ textAlign: 'right' }}>{formatCurrency(totalSubtotal)}</td>
                                        <td style={{ textAlign: 'right', color: totalSaldo > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{formatCurrency(totalSaldo)}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{formatCurrency(totalGeneral)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}
