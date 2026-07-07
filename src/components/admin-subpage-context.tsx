"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type SubpageCtx = {
  title:   string | null
  onBack:  (() => void) | null
  set:     (title: string, onBack: () => void) => void
  clear:   () => void
}

const Ctx = createContext<SubpageCtx>({
  title: null, onBack: null,
  set: () => {}, clear: () => {},
})

export function AdminSubpageProvider({ children }: { children: ReactNode }) {
  const [title,  setTitle]  = useState<string | null>(null)
  const [onBack, setOnBack] = useState<(() => void) | null>(null)

  function set(t: string, back: () => void) {
    setTitle(t)
    setOnBack(() => back)
  }

  function clear() {
    setTitle(null)
    setOnBack(null)
  }

  return <Ctx.Provider value={{ title, onBack, set, clear }}>{children}</Ctx.Provider>
}

export function useAdminSubpage() { return useContext(Ctx) }
