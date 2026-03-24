'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import jsPDF from 'jspdf'

interface Movimiento {
    id: string
    tipo: string
    monto: number
    descripcion?: string | null
    createdAt: string
}

interface Props {
    clienteNombre: string
    clienteId: string
    saldoActual: number
    movimientos: Movimiento[]
}

export function CuentaCorrientePanel({ clienteNombre, clienteId, saldoActual, movimientos }: Props) {
    const [desde, setDesde] = useState('')
    const [hasta, setHasta] = useState('')
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

    // Calculate running balance backwards from saldoActual (through ALL movements first, then filter)
    // movimientos are newest-first from API
    type MovConSaldo = Movimiento & { saldoAnterior: number; saldoDespues: number }
    const allMovsConSaldo: MovConSaldo[] = []
    let saldoRunner = saldoActual
    for (let i = 0; i < movimientos.length; i++) {
        const m = movimientos[i]
        const montoBruto = Number(m.monto)
        const saldoDespues = saldoRunner
        // Undo the movement to get saldoAnterior
        if (m.tipo === 'pago') {
            saldoRunner = saldoRunner + montoBruto // undo payment (was subtracted)
        } else if (m.tipo === 'ajuste') {
            // Ajuste sets saldo to an absolute value — can't reverse, break chain
            saldoRunner = saldoDespues // keep same (we don't know what was before)
        } else {
            // cargo
            saldoRunner = saldoRunner - montoBruto // undo charge (was added)
        }
        allMovsConSaldo.push({ ...m, saldoAnterior: saldoRunner, saldoDespues })
    }
    // Now filter by date
    const movsConSaldo = allMovsConSaldo.filter(m => {
        const fecha = new Date(m.createdAt)
        if (desde && fecha < new Date(desde)) return false
        if (hasta && fecha > new Date(hasta + 'T23:59:59')) return false
        return true
    })

    const toggleSel = (id: string) => {
        const next = new Set(seleccionados)
        next.has(id) ? next.delete(id) : next.add(id)
        setSeleccionados(next)
    }
    const toggleAll = () => {
        if (seleccionados.size === movsConSaldo.length) setSeleccionados(new Set())
        else setSeleccionados(new Set(movsConSaldo.map(m => m.id)))
    }

    const getBadge = (tipo: string) => {
        const t = tipo.toLowerCase()
        if (t === 'cargo') return { label: 'Cargo', className: 'badge-red' }
        if (t === 'pago') return { label: 'Pago', className: 'badge-green' }
        if (t === 'ajuste') return { label: 'Ajuste', className: 'badge-yellow' }
        return { label: tipo, className: 'badge-gray' }
    }

    const generarPDFCuentaCorriente = () => {
        const movsSel = movsConSaldo.filter(m => seleccionados.has(m.id))
        if (movsSel.length === 0) return alert('Seleccioná al menos un movimiento')

        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        let y = 20

        // Header
        doc.setFontSize(18); doc.setFont('helvetica', 'bold')
        doc.text('DETALLE DE CUENTA CORRIENTE', 105, y, { align: 'center' }); y += 8
        doc.setFontSize(12); doc.setFont('helvetica', 'normal')
        doc.text(`Cliente: ${clienteNombre}`, 105, y, { align: 'center' }); y += 6
        
        const fechaDesde = desde ? desde.split('-').reverse().join('/') : 'inicio'
        const fechaHasta = hasta ? hasta.split('-').reverse().join('/') : 'hoy'
        doc.setFontSize(10)
        doc.text(`Período: ${fechaDesde} al ${fechaHasta}`, 105, y, { align: 'center' }); y += 5
        doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, 105, y, { align: 'center' }); y += 6
        doc.setDrawColor(200); doc.line(15, y, 195, y); y += 6

        // Table header
        doc.setFillColor(245, 246, 248)
        doc.rect(15, y - 4, 180, 8, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
        doc.text('FECHA', 17, y)
        doc.text('TIPO', 40, y)
        doc.text('DESCRIPCIÓN', 58, y)
        doc.text('SALDO ANT.', 118, y)
        doc.text('MONTO', 148, y)
        doc.text('SALDO REST.', 172, y)
        y += 6; doc.setDrawColor(200); doc.line(15, y, 195, y); y += 5

        // Rows (show in chronological order for the PDF)
        const movsOrdenados = [...movsSel].reverse()
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
        for (const m of movsOrdenados) {
            if (y > 265) { doc.addPage(); y = 20 }
            const montoBruto = Number(m.monto)
            const montoFirmado = m.tipo === 'pago' ? -montoBruto : montoBruto

            doc.text(formatDate(m.createdAt), 17, y)
            doc.setFont('helvetica', 'bold')
            doc.text(m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1), 40, y)
            doc.setFont('helvetica', 'normal')
            doc.text((m.descripcion || '—').substring(0, 25), 58, y)

            // Saldo anterior
            if (m.saldoAnterior > 0) doc.setTextColor(220, 38, 38)
            else if (m.saldoAnterior < 0) doc.setTextColor(22, 163, 74)
            doc.text(formatCurrency(m.saldoAnterior), 118, y)
            doc.setTextColor(0)

            // Monto
            if (montoFirmado > 0) doc.setTextColor(220, 38, 38)
            else if (montoFirmado < 0) doc.setTextColor(22, 163, 74)
            doc.text(formatCurrency(montoFirmado), 148, y)
            doc.setTextColor(0)

            // Saldo restante
            doc.setFont('helvetica', 'bold')
            if (m.saldoDespues > 0) doc.setTextColor(220, 38, 38)
            else if (m.saldoDespues < 0) doc.setTextColor(22, 163, 74)
            doc.text(formatCurrency(m.saldoDespues), 172, y)
            doc.setTextColor(0)
            doc.setFont('helvetica', 'normal')

            y += 6
        }

        // Footer with current balance
        y += 4; doc.setLineWidth(0.5); doc.line(15, y, 195, y); y += 8
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
        doc.text(`Saldo actual: ${formatCurrency(saldoActual)}`, 195, y, { align: 'right' })

        window.open(doc.output('bloburl'), '_blank')
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Historial de Cuenta Corriente</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{movimientos.length} movimientos totales</span>
            </div>

            {/* Filtros de fecha */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap' }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Desde</label>
                    <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ fontSize: 12, padding: '4px 6px' }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Hasta</label>
                    <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ fontSize: 12, padding: '4px 6px' }} />
                </div>
                {(desde || hasta) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setDesde(''); setHasta('') }} style={{ fontSize: 11 }}>Limpiar</button>
                )}
                {seleccionados.size > 0 && (
                    <button className="btn btn-primary btn-sm" onClick={generarPDFCuentaCorriente} style={{ fontSize: 11 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        Exportar PDF ({seleccionados.size})
                    </button>
                )}
            </div>

            {movsConSaldo.length === 0 ? (
                <div className="empty-state" style={{ padding: 8 }}>
                    <p style={{ fontSize: 13 }}>Sin movimientos{desde || hasta ? ' en el período seleccionado' : ' aún'}.</p>
                </div>
            ) : (
                <div className="table-container" style={{ boxShadow: 'none', border: '1px solid var(--border)', marginTop: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 30 }}><input type="checkbox" checked={seleccionados.size === movsConSaldo.length} onChange={toggleAll} /></th>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Descripción</th>
                                <th style={{ textAlign: 'right' }}>Saldo Ant.</th>
                                <th style={{ textAlign: 'right' }}>Monto</th>
                                <th style={{ textAlign: 'right' }}>Saldo Rest.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movsConSaldo.map(m => {
                                const montoBruto = Number(m.monto)
                                const montoFirmado = m.tipo === 'pago' ? -montoBruto : montoBruto
                                const badge = getBadge(m.tipo)
                                return (
                                    <tr key={m.id} style={{ opacity: seleccionados.size > 0 && !seleccionados.has(m.id) ? 0.5 : 1 }}>
                                        <td><input type="checkbox" checked={seleccionados.has(m.id)} onChange={() => toggleSel(m.id)} /></td>
                                        <td style={{ fontSize: 12 }}>{formatDate(m.createdAt)}</td>
                                        <td><span className={`badge ${badge.className}`} style={{ fontSize: 11 }}>{badge.label}</span></td>
                                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.descripcion || '—'}</td>
                                        <td style={{ textAlign: 'right', fontSize: 12, color: m.saldoAnterior > 0 ? 'var(--red)' : m.saldoAnterior < 0 ? 'var(--green)' : 'inherit' }}>
                                            {formatCurrency(m.saldoAnterior)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: montoFirmado > 0 ? 'var(--red)' : montoFirmado < 0 ? 'var(--green)' : 'inherit' }}>
                                            {formatCurrency(montoFirmado)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: m.saldoDespues > 0 ? 'var(--red)' : m.saldoDespues < 0 ? 'var(--green)' : 'inherit' }}>
                                            {formatCurrency(m.saldoDespues)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
