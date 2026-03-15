'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'

interface Props {
    clienteId: string
    clienteNombre: string
    saldoActual: number
}

export function ClienteSaldoEditor({ clienteId, clienteNombre, saldoActual }: Props) {
    const [editing, setEditing] = useState<'pago' | 'ajuste' | null>(null)
    const [saldo, setSaldo] = useState(saldoActual.toString())
    const [pago, setPago] = useState('')
    const [nota, setNota] = useState('')
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const [lastPago, setLastPago] = useState<{ monto: number; nota: string; saldoAnterior: number; saldoNuevo: number } | null>(null)

    const generarReciboPDF = (montoPago: number, notaPago: string, saldoAnterior: number, saldoNuevo: number) => {
        const doc = new jsPDF({ unit: 'mm', format: [148, 210] }) // A5
        const pw = 148, margin = 12
        let y = margin

        // Header
        doc.setFontSize(20); doc.setFont('helvetica', 'bold')
        doc.text('RECIBO DE PAGO', pw / 2, y + 8, { align: 'center' }); y += 14

        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, pw / 2, y, { align: 'center' }); y += 10

        // Line
        doc.setDrawColor(180); doc.line(margin, y, pw - margin, y); y += 8

        // Cliente
        doc.setFontSize(11); doc.setFont('helvetica', 'normal')
        doc.text('Cliente:', margin, y)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
        doc.text(clienteNombre, margin + 20, y); y += 12

        // Detalle del recibo
        const boxX = margin, boxW = pw - 2 * margin
        doc.setDrawColor(200); doc.setLineWidth(0.3)
        doc.rect(boxX, y, boxW, 52)

        // Saldo anterior
        y += 8
        doc.setFontSize(11); doc.setFont('helvetica', 'normal')
        doc.text('Saldo anterior:', boxX + 6, y)
        doc.setFont('helvetica', 'bold')
        const saldoAntColor = saldoAnterior > 0 ? [220, 38, 38] : saldoAnterior < 0 ? [22, 163, 74] : [0, 0, 0]
        doc.setTextColor(saldoAntColor[0], saldoAntColor[1], saldoAntColor[2])
        doc.text(formatCurrency(saldoAnterior), boxX + boxW - 6, y, { align: 'right' })
        doc.setTextColor(0)

        // Pago
        y += 10
        doc.setFont('helvetica', 'normal')
        doc.text('Pago recibido:', boxX + 6, y)
        doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74)
        doc.text(`- ${formatCurrency(montoPago)}`, boxX + boxW - 6, y, { align: 'right' })
        doc.setTextColor(0)

        // Detalle del pago
        if (notaPago) {
            y += 7
            doc.setFont('helvetica', 'italic'); doc.setFontSize(9)
            doc.text(`Detalle: ${notaPago}`, boxX + 6, y)
            doc.setFontSize(11)
        }

        // Separador
        y += 8
        doc.setDrawColor(180)
        doc.line(boxX + 6, y, boxX + boxW - 6, y)

        // Saldo restante
        y += 8
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
        if (saldoNuevo === 0) {
            doc.setTextColor(22, 163, 74)
            doc.text('CUENTA SALDADA', boxX + 6, y)
            doc.text(formatCurrency(0), boxX + boxW - 6, y, { align: 'right' })
        } else if (saldoNuevo > 0) {
            doc.text('Saldo restante:', boxX + 6, y)
            doc.setTextColor(220, 38, 38)
            doc.text(formatCurrency(saldoNuevo), boxX + boxW - 6, y, { align: 'right' })
        } else {
            doc.text('Saldo a favor:', boxX + 6, y)
            doc.setTextColor(22, 163, 74)
            doc.text(formatCurrency(Math.abs(saldoNuevo)), boxX + boxW - 6, y, { align: 'right' })
        }
        doc.setTextColor(0)

        // Footer
        y += 20
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150)
        doc.text('Papelera Leo | Documento no válido como factura', pw / 2, y, { align: 'center' })
        doc.setTextColor(0)

        window.open(doc.output('bloburl'), '_blank')
    }

    const handleSaveAjuste = async () => {
        setLoading(true)
        await fetch(`/api/clientes/${clienteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ saldo: parseFloat(saldo) }),
        })
        setLoading(false)
        setEditing(null)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        window.location.reload()
    }

    const handleSavePago = async () => {
        if (!pago || parseFloat(pago) <= 0) return alert('Ingresá un monto válido para el pago.')
        const montoPago = parseFloat(pago)
        const saldoAnterior = saldoActual
        const saldoNuevo = saldoAnterior - montoPago

        setLoading(true)
        await fetch(`/api/clientes/${clienteId}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monto: montoPago, nota }),
        })
        setLoading(false)
        setEditing(null)
        setLastPago({ monto: montoPago, nota, saldoAnterior, saldoNuevo })
        setSaved(true)
        setTimeout(() => {
            setSaved(false)
            window.location.reload()
        }, 5000) // Give time to generate receipt before reloading
    }

    if (!editing) {
        return (
            <div>
                {saved && lastPago && (
                    <div className="alert alert-green" style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <span>Pago de <strong>{formatCurrency(lastPago.monto)}</strong> registrado correctamente</span>
                            <button
                                className="btn btn-sm"
                                style={{ background: 'white', color: 'var(--green)', border: '1px solid var(--green)', fontWeight: 700, fontSize: 12 }}
                                onClick={() => generarReciboPDF(lastPago.monto, lastPago.nota, lastPago.saldoAnterior, lastPago.saldoNuevo)}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                Generar Recibo PDF
                            </button>
                        </div>
                    </div>
                )}
                {saved && !lastPago && (
                    <div className="alert alert-green" style={{ marginBottom: 12 }}>Operación guardada correctamente</div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={() => setEditing('pago')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                        Registrar Pago
                    </button>
                    <button className="btn btn-secondary" onClick={() => setEditing('ajuste')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        Editar Saldo Manual
                    </button>
                </div>
            </div>
        )
    }

    if (editing === 'ajuste') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                    <label>Nuevo saldo ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={saldo}
                        onChange={e => setSaldo(e.target.value)}
                        autoFocus
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Positivo = debe · Negativo = a favor</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={handleSaveAjuste} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Ajuste'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
                </div>
            </div>
        )
    }

    if (editing === 'pago') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                    <label>Monto Entregado ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pago}
                        onChange={e => setPago(e.target.value)}
                        placeholder="Ej: 50000"
                        autoFocus
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Este monto se va a descontar del saldo deudado o sumar a favor.</span>
                </div>
                <div className="form-group">
                    <label>Nota del Pago (Opcional)</label>
                    <input
                        type="text"
                        value={nota}
                        onChange={e => setNota(e.target.value)}
                        placeholder="Efectivo, transferencia, cheque..."
                    />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={handleSavePago} disabled={loading}>
                        {loading ? 'Guardando...' : 'Confirmar Pago'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setEditing(null); setPago(''); setNota('') }}>Cancelar</button>
                </div>
            </div>
        )
    }
}
