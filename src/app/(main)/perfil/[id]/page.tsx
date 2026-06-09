import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SellerProductCard, type SellerProduct } from "@/components/seller-product-card"

type SellerProfile = {
  id: string
  name: string | null
  nick: string | null
  avatar_url: string | null
  is_admin: boolean
  game_id: string | null
  created_at: string
}

type RawInventoryRow = {
  id: string
  stock: number
  products: {
    id: string
    name: string
    description: string | null
    price: number
    image_url: string | null
    featured: boolean | null
    pricing_options: unknown
    rarities: { id: string; label: string; color: string } | null
    categories: { id: string; label: string } | null
  }
}

function parseInventory(rows: RawInventoryRow[], sellerId: string): SellerProduct[] {
  return rows.map(row => ({
    inventoryId: row.id,
    stock: row.stock,
    sellerId,
    product: {
      id: row.products.id,
      name: row.products.name,
      description: row.products.description,
      price: Number(row.products.price),
      image_url: row.products.image_url,
      featured: !!row.products.featured,
      pricing_options: Array.isArray(row.products.pricing_options) ? row.products.pricing_options as SellerProduct["product"]["pricing_options"] : [],
      rarity: row.products.rarities ?? null,
      category: row.products.categories ?? null,
    },
  }))
}

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: inventoryRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, nick, avatar_url, is_admin, game_id, created_at")
      .eq("id", id)
      .single<SellerProfile>(),
    supabase
      .from("seller_inventory")
      .select("id, stock, products ( id, name, description, price, image_url, featured, pricing_options, rarities ( id, label, color ), categories ( id, label ) )")
      .eq("seller_id", id)
      .gt("stock", 0)
      .returns<RawInventoryRow[]>(),
  ])

  if (!profile || !profile.is_admin) notFound()

  const inventory = parseInventory(inventoryRows ?? [], id)
  const displayName = profile.name ?? profile.nick ?? "Vendedor"
  const initial = displayName[0]?.toUpperCase() ?? "S"
  const since = new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  return (
    <section className="utility-page">
      <div className="utility-panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--line)" }}
            />
          ) : (
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "var(--cyan-soft)", border: "1px solid var(--cyan)", display: "grid", placeItems: "center" }}>
              <span style={{ fontSize: "28px", fontWeight: 950, color: "var(--cyan)" }}>{initial}</span>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "4px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 950, textTransform: "uppercase" }}>{displayName}</h2>
              <span style={{ fontSize: "10px", fontWeight: 950, textTransform: "uppercase", color: "var(--cyan)", border: "1px solid var(--cyan)", padding: "2px 8px" }}>
                Admin
              </span>
            </div>
            {profile.nick && profile.nick !== profile.name && (
              <p style={{ margin: "0 0 4px", color: "var(--muted)", fontSize: "13px" }}>@{profile.nick}</p>
            )}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {profile.game_id && (
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 800 }}>
                  Game ID: <strong style={{ color: "var(--text)" }}>{profile.game_id}</strong>
                </span>
              )}
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 800 }}>
                Membro desde {since}
              </span>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 800 }}>
                {inventory.length} {inventory.length === 1 ? "item disponível" : "itens disponíveis"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="utility-panel-head" style={{ marginBottom: "16px" }}>
        <strong>Itens disponíveis</strong>
        <small>{inventory.length} {inventory.length === 1 ? "item" : "itens"}</small>
      </div>

      {inventory.length === 0 ? (
        <div className="utility-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0 }}>Nenhum item disponível no momento.</p>
        </div>
      ) : (
        <div className="utility-card-grid">
          {inventory.map(item => (
            <SellerProductCard key={item.inventoryId} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}
