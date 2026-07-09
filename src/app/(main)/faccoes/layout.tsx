"use client"
import { useEffect } from "react"

export default function FaccoesLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const el = document.documentElement
    el.style.scrollbarWidth = "none"
    const style = document.createElement("style")
    style.id = "__faccoes-no-scrollbar"
    style.textContent = "html::-webkit-scrollbar { display: none !important; }"
    document.head.appendChild(style)
    return () => {
      el.style.scrollbarWidth = ""
      document.getElementById("__faccoes-no-scrollbar")?.remove()
    }
  }, [])
  return <>{children}</>
}
