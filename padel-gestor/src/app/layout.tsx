import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PádelGestor',
  description: 'Gestión de torneos de pádel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
