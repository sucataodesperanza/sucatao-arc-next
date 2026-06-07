import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sucatao ARC Companion",
  description: "Preços, raridades, crafting e reciclagem em um painel brasileiro para consulta rápida.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body className="app-shell" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
