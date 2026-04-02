'use client'

import { useState } from 'react'

interface Rubro {
    id: string
    nombre: string
}

interface Props {
    articuloId: string
    rubros: Rubro[]
    rubroId?: string
    rubroNombre?: string
    onUpdate?: () => void
}

export function ArticuloRubroEditor({ articuloId, rubros, rubroId, rubroNombre, onUpdate }: Props) {
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)

    const save = async (newRubroId: string) => {
        setSaving(true)
        await fetch(`/api/articulos/${articuloId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rubroId: newRubroId || null }),
        })
        setSaving(false)
        setEditing(false)
        if (onUpdate) onUpdate()
    }

    if (editing) {
        return (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <select
                    value={rubroId || ''}
                    onChange={e => save(e.target.value)}
                    onBlur={() => setEditing(false)}
                    autoFocus
                    disabled={saving}
                    style={{ padding: '3px 6px', fontSize: 13, border: '1px solid var(--primary-light)', borderRadius: 4, width: 150 }}
                >
                    <option value="">Sin rubro</option>
                    {rubros.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                </select>
                {saving && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>...</span>}
            </div>
        )
    }

    return (
        <span
            onClick={() => setEditing(true)}
            style={{
                cursor: 'pointer',
                color: 'var(--text-muted)',
                borderBottom: '1px dashed var(--border)',
                paddingBottom: 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
            }}
            title="Click para cambiar rubro"
        >
            {rubroNombre || 'Sin rubro'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ opacity: 0.3 }}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
        </span>
    )
}
