import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : ""
  if (!code) return NextResponse.json({ error: "Informe o código do cupom." }, { status: 400 })

  const admin = createAdminClient()
  const { data: coupon } = await admin
    .from("coupons")
    .select("id, code, discount, discount_type, usage_count, usage_limit, expiration_date, status")
    .eq("code", code)
    .single()

  if (!coupon || coupon.status !== "active") {
    return NextResponse.json({ error: "Cupom inválido ou inativo." }, { status: 404 })
  }

  if (coupon.expiration_date && new Date(coupon.expiration_date) < new Date()) {
    return NextResponse.json({ error: "Este cupom expirou." }, { status: 400 })
  }

  if (coupon.usage_limit != null && coupon.usage_count >= coupon.usage_limit) {
    return NextResponse.json({ error: "Este cupom atingiu o limite de usos." }, { status: 400 })
  }

  return NextResponse.json({
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount: Number(coupon.discount),
      discount_type: coupon.discount_type as "fixed" | "percentage",
    },
  })
}
