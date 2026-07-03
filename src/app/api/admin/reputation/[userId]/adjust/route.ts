import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { addReputation } from "@/lib/reputation"

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { userId } = await params
  const body = await req.json().catch(() => ({}))
  const { amount, reason } = body as { amount?: number; reason?: string }

  if (!amount || !reason?.trim()) {
    return NextResponse.json({ error: "amount e reason são obrigatórios." }, { status: 400 })
  }
  if (typeof amount !== "number") {
    return NextResponse.json({ error: "amount deve ser um número." }, { status: 400 })
  }

  await addReputation(userId, amount, "admin", reason.trim())

  return NextResponse.json({ ok: true })
}
