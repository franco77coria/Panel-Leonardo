'use client'

import { useState } from 'react'

export function ClienteSaldoEditor({ clienteId, saldoActual }: { clienteId: string; saldoActual: number }) {
    const [editing, setEditing] = useState(false)
    const [saldo, setSaldo] = useState(saldoActual.toString())
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)

    const handleSave = async () => {
        setLoading(true)
        await fetch(`/api/clientes/${clienteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ saldo: parseFloat(saldo) }),
        })
        setLoading(false)
        setEditing(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        window.location.reload()
    }

    if (!editing) {
        return (
            <div>
                {saved && <div className="alert alert-green" style={{ marginBottom: 12 }}>Saldo actualizado correctamente</div>}
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
                    Podés editar el saldo manualmente para ajustes, pagos o correcciones.
                </p>
                <button className="btn btn-secondary" onClick={() => setEditing(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    Editar Saldo
                </button>
            </div>
        )
    }

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
                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar'}
                </button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
        </div>
    )
}
