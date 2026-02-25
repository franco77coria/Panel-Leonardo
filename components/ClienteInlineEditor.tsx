'use client'

import { useState } from 'react'

interface Props {
    clienteId: string
    field: 'localidad' | 'direccion' | 'telefono'
    value: string
    placeholder?: string
}

export function ClienteInlineEditor({ clienteId, field, value: initialValue, placeholder }: Props) {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(initialValue)
    const [saving, setSaving] = useState(false)

    const save = async () => {
        if (value === initialValue) { setEditing(false); return }
        setSaving(true)
        await fetch(`/api/clientes/${clienteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value }),
        })
        setSaving(false)
        setEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') { setValue(initialValue); setEditing(false) }
    }

    if (editing) {
        return (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={save}
                    placeholder={placeholder}
                    autoFocus
                    style={{ width: 120, padding: '3px 6px', fontSize: 12, border: '1px solid var(--primary-light)', borderRadius: 4 }}
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
                color: value ? 'var(--text-secondary)' : 'var(--text-muted)',
                fontSize: 13,
                borderBottom: '1px dashed var(--border)',
                paddingBottom: 1,
            }}
            title="Click para editar"
        >
            {value || placeholder || '–'}
        </span>
    )
}
