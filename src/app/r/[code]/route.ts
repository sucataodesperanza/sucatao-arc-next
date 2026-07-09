import { NextResponse, type NextRequest } from "next/server"

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const res = NextResponse.redirect(new URL("/login?mode=register", req.url))

  // Armazena o código por 30 dias — lido no momento do cadastro
  res.cookies.set("ref_code", code.toUpperCase(), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  })

  return res
}
