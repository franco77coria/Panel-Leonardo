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
                                </tr>
                            </thead>
                            <tbody>
                                {proveedores.map(p => (
                                    <tr key={p.id}>
                                        <td>{p.nombre}</td>
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

