'use client'

import { useEffect, useState } from 'react'

interface Rubro {
    id: string
    nombre: string
}

export default function RubrosPage() {
    const [rubros, setRubros] = useState<Rubro[]>([])
    const [loading, setLoading] = useState(true)
    const [nuevoNombre, setNuevoNombre] = useState('')
    const [savingId, setSavingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchRubros = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/rubros')
            const data = await res.json()
            setRubros(data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRubros()
    }, [])

    const handleCrear = async () => {
        if (!nuevoNombre.trim()) return alert('Ingresá un nombre para el rubro.')
        const res = await fetch('/api/rubros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoNombre.trim() }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => null)
            alert(data?.error || 'No se pudo crear el rubro.')
            return
        }
        setNuevoNombre('')
        fetchRubros()
    }

    const handleRenombrar = async (id: string, nombreActual: string) => {
        const nuevo = prompt('Nuevo nombre del rubro:', nombreActual)
        if (nuevo === null || nuevo.trim() === '' || nuevo === nombreActual) return
        setSavingId(id)
        try {
            const res = await fetch(`/api/rubros/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nuevo.trim() }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => null)
                alert(data?.error || 'No se pudo actualizar el rubro.')
                return
            }
            fetchRubros()
        } finally {
            setSavingId(null)
        }
    }

    const handleEliminar = async (id: string, nombre: string) => {
        if (!confirm(`¿Eliminar el rubro "${nombre}"?\n\nSolo se puede eliminar si no tiene artículos ni packs asociados.`)) return
        setDeletingId(id)
        try {
            const res = await fetch(`/api/rubros/${id}`, { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json().catch(() => null)
                alert(data?.error || 'No se pudo eliminar el rubro.')
                return
            }
            fetchRubros()
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Rubros</h1>
                    <p className="page-subtitle">Organizá los artículos por rubro. Podés renombrarlos o eliminarlos si no están en uso.</p>
                </div>
            </div>

            <div className="page-body">
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">Nuevo Rubro</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                            value={nuevoNombre}
                            onChange={e => setNuevoNombre(e.target.value)}
                            placeholder="Ej: Bolsas, Papelería, Limpieza..."
                            style={{ flex: 1, minWidth: 200 }}
                        />
                        <button className="btn btn-primary" onClick={handleCrear}>
                            Guardar
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <div className="table-header">
                        <span className="table-title">Rubros existentes ({rubros.length})</span>
                    </div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <div className="spinner" style={{ margin: '0 auto' }} />
                        </div>
                    ) : rubros.length === 0 ? (
                        <div className="empty-state">
                            <p>No hay rubros cargados aún.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th style={{ width: 160 }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rubros.map(r => (
                                    <tr key={r.id}>
                                        <td>{r.nombre}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleRenombrar(r.id, r.nombre)}
                                                    disabled={savingId === r.id || deletingId === r.id}
                                                >
                                                    Renombrar
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ color: 'var(--red)' }}
                                                    onClick={() => handleEliminar(r.id, r.nombre)}
                                                    disabled={savingId === r.id || deletingId === r.id}
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    )
}

