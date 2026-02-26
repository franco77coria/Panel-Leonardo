import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, getSaldoStatus } from '@/lib/utils'
import Link from 'next/link'
import { ExportClientesPDF, PrintButton } from '@/components/ExportPDF'
import { ClienteInlineEditor } from '@/components/ClienteInlineEditor'
import { ExportDeudoresCSV, ExportAFavorCSV } from '@/components/ExportCSV'

export const dynamic = 'force-dynamic'

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ ciudad?: string }> }) {
    const { ciudad = '' } = await searchParams

    const clientes = await prisma.cliente.findMany({
        where: {
            activo: true,
            ...(ciudad && { localidad: { contains: ciudad, mode: 'insensitive' } }),
        },
        orderBy: { nombre: 'asc' },
    })

    const deudores = clientes.filter(c => Number(c.saldo) > 0)
    const aFavor = clientes.filter(c => Number(c.saldo) < 0)
    const ciudades = Array.from(
        new Set([
            'Las Heras',
            'Marcos Paz',
            'Mariano Acosta',
            ...clientes.map(c => ((c as any).localidad as string | undefined) || '').filter(Boolean),
        ])
    ).sort((a, b) => a.localeCompare(b, 'es'))

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Clientes</h1>
                    <p className="page-subtitle">{clientes.length} clientes activos {ciudad && <>en <strong>{ciudad}</strong></>}</p>
                </div>
                <div className="page-actions">
                    <ExportClientesPDF clientes={clientes.map(c => ({ nombre: c.nombre, ciudad: (c as any).localidad || '', direccion: c.direccion || '', telefono: c.telefono || '', saldo: Number(c.saldo), fecha: c.createdAt.toISOString() }))} />
                    <ExportDeudoresCSV
                        deudores={deudores.map(c => ({
                            nombre: c.nombre,
                            ciudad: (c as any).localidad || '',
                            direccion: c.direccion || '',
                            telefono: c.telefono || '',
                            saldo: Number(c.saldo),
                            fechaAlta: c.createdAt.toISOString(),
                        }))}
                    />
                    <ExportAFavorCSV
                        clientes={aFavor.map(c => ({
                            nombre: c.nombre,
                            ciudad: (c as any).localidad || '',
                            direccion: c.direccion || '',
                            telefono: c.telefono || '',
                            saldo: Number(c.saldo),
                            fechaAlta: c.createdAt.toISOString(),
                        }))}
                    />
                    <PrintButton />
                    <Link href="/clientes/nuevo" className="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Nuevo Cliente
                    </Link>
                </div>
            </div>

            <div className="page-body">
                <form method="GET" style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Filtrar por ciudad:</label>
                    <select name="ciudad" defaultValue={ciudad} style={{ minWidth: 160 }}>
                        <option value="">Todas</option>
                        {ciudades.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <button type="submit" className="btn btn-secondary btn-sm">Aplicar</button>
                    {ciudad && (
                        <Link href="/clientes" className="btn btn-ghost btn-sm">Limpiar</Link>
                    )}
                </form>

                <div className="kpi-grid" style={{ marginBottom: 20 }}>
                    <div className="kpi-card">
                        <div className="kpi-label">Total Clientes</div>
                        <div className="kpi-value">{clientes.length}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Con Deuda</div>
                        <div className="kpi-value" style={{ color: 'var(--red)' }}>{clientes.filter(c => Number(c.saldo) > 0).length}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Con Saldo a Favor</div>
                        <div className="kpi-value" style={{ color: 'var(--green)' }}>{clientes.filter(c => Number(c.saldo) < 0).length}</div>
                    </div>
                </div>

                <div className="table-container">
                    {clientes.length === 0 ? (
                        <div className="empty-state">
                            <p>No hay clientes aún.</p>
                            <Link href="/clientes/nuevo" className="btn btn-primary">Agregar Cliente</Link>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th className="hide-mobile">Ciudad</th>
                                    <th className="hide-mobile">Domicilio</th>
                                    <th className="hide-mobile">Teléfono</th>
                                    <th>Saldo</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientes.map((c) => {
                                    const saldo = getSaldoStatus(Number(c.saldo))
                                    return (
                                        <tr key={c.id}>
                                            <td>
                                                <Link href={`/clientes/${c.id}`} style={{ fontWeight: 700, color: 'var(--primary-light)', textDecoration: 'none' }}>
                                                    {c.nombre}
                                                </Link>
                                            </td>
                                            <td className="hide-mobile" style={{ color: 'var(--text-muted)', fontSize: 13 }}>{(c as any).localidad || '–'}</td>
                                            <td className="hide-mobile">
                                                <ClienteInlineEditor clienteId={c.id} field="direccion" value={c.direccion || ''} placeholder="Agregar domicilio..." />
                                            </td>
                                            <td className="hide-mobile">
                                                <ClienteInlineEditor clienteId={c.id} field="telefono" value={c.telefono || ''} placeholder="Agregar teléfono..." />
                                            </td>
                                            <td>
                                                <span className={`badge badge-${saldo.color}`}>{saldo.label}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <Link href={`/clientes/${c.id}`} className="btn btn-ghost btn-sm">Ver</Link>
                                                    <Link href={`/pedidos/nuevo?clienteId=${c.id}`} className="btn btn-primary btn-sm">Pedido</Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    )
}
