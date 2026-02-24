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
                {saved && <div className="alert alert-green" style={{ marginBottom: 12 }}>✅ Saldo actualizado</div>}
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>
                    Podés editar el saldo manualmente para ajustes, pagos o correcciones.
                </p>
                <button className="btn btn-secondary" onClick={() => setEditing(true)}>
                    ✏️ Editar Saldo
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
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Positivo = debe, Negativo = a favor</span>
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
