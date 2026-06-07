import { Topbar } from "@/components/topbar"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <main className="content">
        {children}
      </main>
    </>
  )
}
