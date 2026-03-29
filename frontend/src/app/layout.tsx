import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: '11za Commerce',
  description: 'Scalable webhook tracking dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable} antialiased h-full`}>
      <body className="font-outfit text-zinc-100 bg-[#0a0f0d] min-h-full flex flex-col items-stretch m-0 p-0 selection:bg-green-500/30">
        {children}
      </body>
    </html>
  )
}
