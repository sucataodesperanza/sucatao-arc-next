import Link from "next/link"
import { BrandMark } from "@/components/brand-mark"

export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="auth-shell">
      <div className="auth-shell-panel">
        <Link href="/" className="auth-shell-brand">
          <BrandMark />
        </Link>
        <div className={`auth-shell-content${footer ? " auth-shell-content-grow" : ""}`}>{children}</div>
        {footer && <div className="auth-shell-footer">{footer}</div>}
      </div>
      <div className="auth-shell-art" style={{ backgroundImage: "url(/assets/bots/arc_matriarch.png)" }} />
    </div>
  )
}
