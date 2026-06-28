import { NextResponse, type NextRequest } from "next/server"

/**
 * Cron job diário (03:00 BRT = 06:00 UTC)
 * Executa em sequência: sync itens → sync traders → sync quests → recalc VEI
 * Protegido por CRON_SECRET.
 *
 * vercel.json:
 * { "crons": [{ "path": "/api/cron/daily-sync", "schedule": "0 6 * * *" }] }
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const base = request.nextUrl.origin
  const results: Record<string, unknown> = {}

  const steps = [
    { key: "items",   url: `${base}/api/admin/catalog/sync`          },
    { key: "traders", url: `${base}/api/admin/economia/sync-traders`  },
    { key: "quests",  url: `${base}/api/admin/economia/sync-quests`   },
    { key: "vei",     url: `${base}/api/admin/economia/recalc-vei`    },
  ]

  for (const step of steps) {
    try {
      const res = await fetch(step.url, {
        method: "POST",
        headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
      })
      const body = await res.json().catch(() => ({}))
      results[step.key] = res.ok ? body : { error: body.error ?? res.status }
    } catch (err) {
      results[step.key] = { error: (err as Error).message }
    }
  }

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), results })
}
