'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { generarReciboPDF } from '@/lib/pdf'

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
        }, 5000)
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
                                onClick={() => generarReciboPDF(clienteNombre, lastPago.monto, lastPago.nota, lastPago.saldoAnterior, lastPago.saldoNuevo)}
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
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
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
                </div>
                <div className="form-group">
                    <label>Nota del Pago (Opcional)</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        {['Efectivo', 'Transferencia', 'Mercadería', 'Cheque'].map(tipo => (
                            <button
                                key={tipo}
                                type="button"
                                className={`btn btn-sm ${nota === tipo ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setNota(nota === tipo ? '' : tipo)}
                                style={{ fontSize: 11 }}
                            >{tipo}</button>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={nota}
                        onChange={e => setNota(e.target.value)}
                        placeholder="Efectivo, transferencia, cheque..."
                    />
                </div>

                {/* Resumen dinámico del saldo resultante */}
                {pago && parseFloat(pago) > 0 && (
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>Saldo actual</span>
                            <span style={{ fontWeight: 700, color: saldoActual > 0 ? 'var(--red)' : saldoActual < 0 ? 'var(--green)' : 'inherit' }}>
                                {formatCurrency(saldoActual)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>Pago a ingresar</span>
                            <span style={{ fontWeight: 700, color: 'var(--green)' }}>- {formatCurrency(parseFloat(pago))}</span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700 }}>Saldo restante</span>
                            {(() => {
                                const nuevo = saldoActual - parseFloat(pago)
                                return <span style={{ fontWeight: 800, color: nuevo > 0 ? 'var(--red)' : nuevo < 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                                    {nuevo > 0 ? `Debe ${formatCurrency(nuevo)}` : nuevo < 0 ? `A favor ${formatCurrency(Math.abs(nuevo))}` : 'CUENTA SALDADA'}
                                </span>
                            })()}
                        </div>
                    </div>
                )}

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
