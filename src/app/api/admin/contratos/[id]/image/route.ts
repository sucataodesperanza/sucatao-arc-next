import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 })

  const ext  = file.name.split(".").pop() ?? "png"
  const path = `${id}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const supabase = createAdminClient()
  const { error: uploadError } = await supabase.storage
    .from("contract-images")
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from("contract-images").getPublicUrl(path)

  await supabase.from("contracts").update({ image_url: publicUrl }).eq("id", id)

  return NextResponse.json({ url: publicUrl })
}
