'use client'

import { useState } from 'react'

export function ClienteSaldoEditor({ clienteId, saldoActual }: { clienteId: string; saldoActual: number }) {
    const [editing, setEditing] = useState<'pago' | 'ajuste' | null>(null)
    const [saldo, setSaldo] = useState(saldoActual.toString())
    const [pago, setPago] = useState('')
    const [nota, setNota] = useState('')
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)

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
        setLoading(true)
        await fetch(`/api/clientes/${clienteId}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monto: parseFloat(pago), nota }),
        })
        setLoading(false)
        setEditing(null)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        window.location.reload()
    }

    if (!editing) {
        return (
            <div>
                {saved && <div className="alert alert-green" style={{ marginBottom: 12 }}>Operación guardada correctamente</div>}
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
                        placeholder="Efectivo, transferencia, etc..."
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
