"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react"

/* ── Toast ─────────────────────────────────────────────────────────────── */

type ToastType = "success" | "error" | "info" | "warning"
type ToastItem = { id: string; type: ToastType; message: string }

type ToastCtx = {
  toast: (type: ToastType, message: string) => void
  success: (message: string) => void
  error:   (message: string) => void
  info:    (message: string) => void
}

const ToastContext = createContext<ToastCtx>({
  toast:   () => {},
  success: () => {},
  error:   () => {},
  info:    () => {},
})

export function useToast() { return useContext(ToastContext) }

/* ── Confirm ────────────────────────────────────────────────────────────── */

type ConfirmState = { message: string; resolve: (ok: boolean) => void } | null
type ConfirmCtx  = { confirm: (message: string) => Promise<boolean> }

const ConfirmContext = createContext<ConfirmCtx>({ confirm: async () => false })

export function useConfirm() { return useContext(ConfirmContext) }

/* ── Provider combinado ─────────────────────────────────────────────────── */

export function AdminNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts]     = useState<ToastItem[]>([])
  const [dialog, setDialog]     = useState<ConfirmState>(null)
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    clearTimeout(timeouts.current.get(id))
    timeouts.current.delete(id)
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts(prev => [...prev.slice(-4), { id, type, message }])
    const tid = setTimeout(() => dismiss(id), 4500)
    timeouts.current.set(id, tid)
  }, [dismiss])

  const success = useCallback((m: string) => toast("success", m), [toast])
  const error   = useCallback((m: string) => toast("error",   m), [toast])
  const info    = useCallback((m: string) => toast("info",    m), [toast])

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise(resolve => setDialog({ message, resolve }))
  }, [])

  function resolveDialog(ok: boolean) {
    dialog?.resolve(ok)
    setDialog(null)
  }

  const ICONS: Record<ToastType, React.ElementType> = {
    success: CheckCircle,
    error:   XCircle,
    info:    Info,
    warning: AlertTriangle,
  }

  const COLORS: Record<ToastType, { border: string; bg: string; icon: string }> = {
    success: { border: "rgba(61,242,139,0.35)",  bg: "rgba(61,242,139,0.08)",  icon: "#3df28b" },
    error:   { border: "rgba(255,97,113,0.35)",  bg: "rgba(255,97,113,0.08)",  icon: "#ff6171" },
    info:    { border: "rgba(95,168,255,0.35)",  bg: "rgba(95,168,255,0.08)",  icon: "#5fa8ff" },
    warning: { border: "rgba(255,212,0,0.35)",   bg: "rgba(255,212,0,0.08)",   icon: "#ffd400" },
  }

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      <ConfirmContext.Provider value={{ confirm }}>
        {children}

        {/* ── Toasts ── */}
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          display: "flex", flexDirection: "column", gap: 8,
          pointerEvents: "none",
        }}>
          {toasts.map(t => {
            const Icon = ICONS[t.type]
            const c    = COLORS[t.type]
            return (
              <div
                key={t.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "12px 14px",
                  border: `1px solid ${c.border}`,
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${c.bg} 100%, rgba(4,9,14,0.92))`,
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  color: "var(--paper)",
                  fontSize: 13,
                  fontWeight: 800,
                  maxWidth: 320,
                  pointerEvents: "auto",
                  animation: "toast-in 0.2s ease",
                }}
              >
                <Icon size={16} style={{ color: c.icon, flexShrink: 0, marginTop: 1 }} />
                <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}
                  aria-label="Fechar"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>

        {/* ── Dialog de confirmação ── */}
        {dialog && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 16,
            }}
            onClick={() => resolveDialog(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: "min(420px, 100%)",
                border: "1px solid var(--stroke)",
                borderRadius: 14,
                background: "var(--surface-2)",
                padding: 24,
                boxShadow: "0 20px 48px rgba(0,0,0,0.5)",
                display: "flex", flexDirection: "column", gap: 20,
              }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: "rgba(255,97,113,0.12)",
                  display: "grid", placeItems: "center",
                }}>
                  <AlertTriangle size={20} style={{ color: "var(--red)" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 950, fontSize: 14, color: "var(--paper)" }}>
                    Confirmar ação
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--paper-dim)", lineHeight: 1.5 }}>
                    {dialog.message}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => resolveDialog(false)}
                  style={{
                    border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.04)",
                    color: "var(--paper-dim)", padding: "9px 16px", fontSize: 12,
                    fontWeight: 950, textTransform: "uppercase", cursor: "pointer",
                    borderRadius: 8, font: "inherit",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => resolveDialog(true)}
                  style={{
                    border: "1px solid rgba(255,97,113,0.5)",
                    background: "rgba(255,97,113,0.12)", color: "var(--red)",
                    padding: "9px 16px", fontSize: 12, fontWeight: 950,
                    textTransform: "uppercase", cursor: "pointer",
                    borderRadius: 8, font: "inherit",
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}
