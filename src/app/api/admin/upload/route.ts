import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET   = "reward-images"
const MAX_SIZE = 4 * 1024 * 1024 // 4 MB
const ALLOWED  = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: "FormData inválido." }, { status: 400 })

  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 })
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Tipo não permitido. Use JPG, PNG, WEBP ou GIF." }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 4 MB." }, { status: 400 })
  }

  const ext      = file.name.split(".").pop() ?? "jpg"
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: false })

  if (error) {
    console.error("upload error:", error)
    return NextResponse.json({ error: "Erro ao fazer upload." }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename)

  return NextResponse.json({ url: publicUrl })
}
