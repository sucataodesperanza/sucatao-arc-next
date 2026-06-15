"use client"

import { Bot } from "lucide-react"
import type { ItemsCatalog } from "@/lib/use-items-catalog"

export function ArcIntelPanel({ catalog }: { catalog: ItemsCatalog }) {
  const { visibleBots, botFilter, setBotFilter } = catalog

  return (
    <div className="store-side-card">
      <div className="store-side-head">
        <h2>ARC Intel</h2>
      </div>
      <div className="store-side-list">
        {visibleBots.map(bot => {
          const active = botFilter === bot.id
          return (
            <button
              key={bot.id}
              type="button"
              className={`store-side-item store-side-item-button${active ? " active" : ""}`}
              title={bot.weakness ?? bot.description ?? bot.name}
              onClick={() => setBotFilter(active ? null : bot.id)}
            >
              <div className="store-side-thumb">
                {bot.image ? <img src={`/${bot.image}`} alt={bot.name} loading="lazy" /> : <Bot size={18} />}
              </div>
              <div className="store-side-info">
                <strong>{bot.name}</strong>
                <span>{bot.threat ?? bot.type ?? "ARC"}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
