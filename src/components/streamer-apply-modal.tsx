"use client"

import { useState } from "react"
import { ExternalLink, X } from "lucide-react"

const PLATFORMS = ["twitch", "youtube", "kick"]

interface Props { onClose: () => void }

export default function StreamerApplyModal({ onClose }: Props) {
  const [form, setForm]       = useState({ nickname: "", platform: "twitch", channel_url: "", message: "" })
  const [sending, setSending] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSending(true)
    const res = await fetch("/api/streamers/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSending(false)
    if (res.ok) { setDone(true) }
    else { const b = await res.json().catch(() => ({})); setError(b.error ?? "Erro ao enviar inscrição.") }
  }

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
    color: "var(--paper)", padding: "10px 12px", fontSize: 13, borderRadius: 6,
    font: "inherit", width: "100%", boxSizing: "border-box",
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(2,7,11,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, width: "100%", maxWidth: 480, padding: 28, position: "relative" }} onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4 }}>
          <X size={18} />
        </button>

        {done ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 950, textTransform: "uppercase" }}>Inscrição Enviada!</h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--paper-dim)" }}>Nossa equipe vai analisar sua inscrição e entrar em contato em breve.</p>
            <button type="button" onClick={onClose} style={{ border: "1px solid var(--stroke)", background: "none", color: "var(--paper)", padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer", borderRadius: 6, font: "inherit" }}>Fechar</button>
          </div>
        ) : (
          <>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--cyan)", opacity: 0.7 }}>Programa de Streamers</p>
            <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 950, textTransform: "uppercase" }}>Inscrição de Parceiro</h2>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Nickname / Nome do Canal *</span>
                <input required value={form.nickname} onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))} placeholder="Seu nome na plataforma" style={inp} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Plataforma *</span>
                <select required value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                  {PLATFORMS.map(p => <option key={p} value={p} style={{ background: "#0a0f14", textTransform: "capitalize" }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>URL do Canal *</span>
                <div style={{ position: "relative" }}>
                  <input required type="url" value={form.channel_url} onChange={e => setForm(p => ({ ...p, channel_url: e.target.value }))} placeholder="https://twitch.tv/seunome" style={{ ...inp, paddingRight: 36 }} />
                  {form.channel_url && <a href={form.channel_url} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--cyan)", opacity: 0.7 }}><ExternalLink size={14} /></a>}
                </div>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Por que quer ser parceiro?</span>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Fale um pouco sobre você e seu conteúdo..." rows={4} style={{ ...inp, resize: "vertical" }} />
              </label>

              {error && <p style={{ margin: 0, fontSize: 13, color: "var(--red)", fontWeight: 700 }}>{error}</p>}

              <button type="submit" disabled={sending} style={{ border: "none", background: "var(--cyan)", color: "#000", padding: "12px 24px", fontSize: 13, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit", opacity: sending ? 0.7 : 1 }}>
                {sending ? "Enviando..." : "Enviar Inscrição"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
