import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = [
  "/login",
  "/registro",
  "/recuperar-senha",
  "/completar-cadastro",
  "/atualizar-senha",
  "/confirmar-email",
]

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() lê direto do cookie (sem chamada de rede) — evita timeouts no middleware.
  // getUser() valida com o servidor Supabase e causa lentidão/loop infinito no primeiro login.
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl
  const isPublicPath =
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))

  if (!session && !isPublicPath) {
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("next", pathname)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    supabaseResponse.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
