import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'
import { auth } from '@/auth'

export const metadata: Metadata = {
  title: 'Papelera Leo – Sistema de Gestión',
  description: 'Sistema de gestión integral para distribuidora',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const isLoggedIn = !!session?.user

  return (
    <html lang="es">
      <body>
        {isLoggedIn ? (
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              {children}
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  )
}
