'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Props {
    articuloId: string
    costo: number
    onUpdate?: () => void
}

export function ArticuloCostoEditor({ articuloId, costo: initialValue, onUpdate }: Props) {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(initialValue.toString())
    const [saving, setSaving] = useState(false)

    const save = async () => {
        const numValue = Number(value)
        if (isNaN(numValue) || numValue === initialValue) {
            setEditing(false)
            setValue(initialValue.toString())
            return
        }

        setSaving(true)
        await fetch(`/api/articulos/${articuloId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ costo: numValue }),
        })

        setSaving(false)
        setEditing(false)
        if (onUpdate) onUpdate()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') { setValue(initialValue.toString()); setEditing(false) }
    }

    if (editing) {
        return (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>$</span>
                <input
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={save}
                    autoFocus
                    style={{ width: 80, padding: '3px 6px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 4, fontWeight: 'bold' }}
                />
                {saving && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>...</span>}
            </div>
        )
    }

    return (
        <span
            onClick={() => setEditing(true)}
            style={{
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                borderBottom: '1px dashed var(--border)',
                paddingBottom: 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
            }}
            title="Click para editar costo"
        >
            {formatCurrency(initialValue)}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ opacity: 0.4 }}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
        </span>
    )
}
