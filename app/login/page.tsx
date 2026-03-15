'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username || !password) return setError('Completá ambos campos')
        setError('')
        setLoading(true)

        const res = await signIn('credentials', {
            username,
            password,
            redirect: false,
        })

        if (res?.error) {
            setError('Usuario o contraseña incorrectos')
            setLoading(false)
        } else {
            router.push('/')
            router.refresh()
        }
    }

    return (
        <div className="login-page">
            <div className="login-bg">
                <div className="login-bg-shape login-bg-shape-1" />
                <div className="login-bg-shape login-bg-shape-2" />
                <div className="login-bg-shape login-bg-shape-3" />
            </div>

            <div className="login-container">
                <div className="login-card">
                    {/* Logo / Brand */}
                    <div className="login-brand">
                        <div className="login-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                <line x1="9" y1="7" x2="15" y2="7" />
                                <line x1="9" y1="11" x2="15" y2="11" />
                            </svg>
                        </div>
                        <h1 className="login-title">Papelera Leo</h1>
                        <p className="login-subtitle">Sistema de Gestión</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="login-field">
                            <label htmlFor="username">Usuario</label>
                            <div className="login-input-wrap">
                                <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Ingresá tu usuario"
                                    autoComplete="username"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="login-field">
                            <label htmlFor="password">Contraseña</label>
                            <div className="login-input-wrap">
                                <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Ingresá tu contraseña"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="login-eye"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="login-error">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="login-spinner" />
                                    Ingresando...
                                </>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        Acceso restringido
                    </div>
                </div>
            </div>
        </div>
    )
}
