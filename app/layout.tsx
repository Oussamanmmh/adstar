import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

const geist = Geist({ 
  subsets: ["latin"],
  variable: "--font-geist-sans"
})
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: "--font-geist-mono"
})

export const metadata: Metadata = {
  title: 'Adstar - اربح من تقييم الفيديوهات',
  description: 'اشترك في باقة، قيّم الفيديوهات يومياً، واربح USDT. بسيط وشفاف ومجزٍ.',
}

export const viewport: Viewport = {
  themeColor: '#0a0e27',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`} >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster 
          position="top-left" 
          toastOptions={{
            style: {
              background: 'oklch(0.16 0.025 260)',
              border: '1px solid oklch(0.25 0.03 260)',
              color: 'oklch(0.98 0 0)',
            },
          }}
        />
      </body>
    </html>
  )
}
