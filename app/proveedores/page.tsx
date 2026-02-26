'use client'

import { useEffect, useState } from 'react'

interface Proveedor {
    id: string
    nombre: string
    telefono?: string | null
}

export default function ProveedoresPage() {
    const [proveedores, setProveedores] = useState<Proveedor[]>([])
    const [loading, setLoading] = useState(true)
    const [nombre, setNombre] = useState('')

    const fetchProveedores = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/proveedores')
            const data = await res.json()
            setProveedores(data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProveedores()
    }, [])

    const handleCrear = async () => {
        if (!nombre.trim()) return alert('Ingresá un nombre para el proveedor.')
        const res = await fetch('/api/proveedores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombre.trim() }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => null)
            alert(data?.error || 'No se pudo crear el proveedor.')
            return
        }
        setNombre('')
        fetchProveedores()
    }

    const handleEliminar = async (id: string, nombre: string) => {
        if (!confirm(`¿Eliminar el proveedor "${nombre}"?\n\nLos artículos que lo usen quedarán sin proveedor asignado.`)) return
        const res = await fetch(`/api/proveedores/${id}`, { method: 'DELETE' })
        if (!res.ok) {
            const data = await res.json().catch(() => null)
            alert(data?.error || 'No se pudo eliminar el proveedor.')
            return
        }
        fetchProveedores()
    }

    const handleEditar = async (id: string, nombreActual: string) => {
        const nuevo = prompt('Nuevo nombre del proveedor:', nombreActual)
        if (nuevo === null || nuevo.trim() === '' || nuevo === nombreActual) return
        const res = await fetch(`/api/proveedores/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevo.trim() }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => null)
            alert(data?.error || 'No se pudo actualizar el proveedor.')
            return
        }
        fetchProveedores()
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Proveedores</h1>
                    <p className="page-subtitle">Listado simple de proveedores para usar en los artículos.</p>
                </div>
            </div>

            <div className="page-body">
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">Nuevo Proveedor</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="Ej: Proveedor Mayorista X"
                            style={{ flex: 1, minWidth: 200 }}
                        />
                        <button className="btn btn-primary" onClick={handleCrear}>
                            Guardar
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <div className="table-header">
                        <span className="table-title">Proveedores ({proveedores.length})</span>
                    </div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <div className="spinner" style={{ margin: '0 auto' }} />
                        </div>
                    ) : proveedores.length === 0 ? (
                        <div className="empty-state">
                            <p>No hay proveedores cargados aún.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th style={{ width: 100 }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proveedores.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() => handleEditar(p.id, p.nombre)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    fontSize: 'inherit',
                                                    fontWeight: 600,
                                                    color: 'var(--primary-light)',
                                                    textDecoration: 'underline',
                                                    textDecorationStyle: 'dashed',
                                                }}
                                                title="Click para editar nombre"
                                            >
                                                {p.nombre}
                                            </button>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handleEditar(p.id, p.nombre)}
                                                title="Editar nombre del proveedor"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: 4 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                Editar
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ color: 'var(--red)', marginLeft: 6 }}
                                                onClick={() => handleEliminar(p.id, p.nombre)}
                                                title="Eliminar proveedor"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ verticalAlign: 'middle' }}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                Eliminar
                                            </button>
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

