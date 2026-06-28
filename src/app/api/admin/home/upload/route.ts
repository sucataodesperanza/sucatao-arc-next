import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const name = formData.get("name") as string | null
  if (!file) return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 })
  const ext  = file.name.split(".").pop() ?? "png"
  const path = `${name ?? Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const admin = createAdminClient()
  const { error } = await admin.storage.from("home-assets").upload(path, buffer, { contentType: file.type, upsert: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: { publicUrl } } = admin.storage.from("home-assets").getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
