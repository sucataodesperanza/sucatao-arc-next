"use client"
import { useEffect, useState } from "react"
import { useCart, type CartMode } from "@/lib/cart-context"
import { readyKitContents, type ReadyKit } from "@/lib/ready-kits"
import "@/styles/ready-kits.css"
type Item={id:string;name:string;image?:string;quantity:number}
const cash=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})
export function ReadyKits(){
  const [data,setData]=useState<{kits:ReadyKit[];items:Item[]}|null>(null)
  const [error,setError]=useState("")
  const [mode,setMode]=useState<CartMode>("points")
  const cart=useCart()
  useEffect(()=>{const c=new AbortController();fetch("/api/store/ready-kits",{cache:"no-store",signal:c.signal}).then(async r=>{if(!r.ok)throw new Error("Não foi possível carregar os kits. Atualize a página para tentar novamente.");setData(await r.json())}).catch(e=>{if(!c.signal.aborted)setError(e.message)});return()=>c.abort()},[])
  return <section className="ready-kits"><h2>Kits prontos</h2><p>Escolha seu pacote e leve todos os itens de uma vez.</p><div className="ready-kit-payment" role="group" aria-label="Pagamento dos kits"><button aria-pressed={mode==="points"} onClick={()=>setMode("points")}>Pontos</button><button aria-pressed={mode==="cash"} onClick={()=>setMode("cash")}>Reais</button></div>
    {error?<p role="alert">{error}</p>:!data?<p role="status">Carregando kits…</p>:!data.kits.length?<p>Novos kits em breve.</p>:<div className="ready-kit-grid">{data.kits.map(kit=>{
      const image=kit.image||data.items.find(i=>i.id===kit.entries[0]?.itemId)?.image
      const price=mode==="points"?kit.pricePoints:kit.priceCash
      const unavailable=kit.entries.some(e=>{
        const existing=cart.items.reduce((sum,line)=>sum+(line.itemId===e.itemId?line.quantity:0)+(line.itemId.startsWith("kit:")?(data.kits.find(k=>`kit:${k.id}`===line.itemId)?.entries.find(x=>x.itemId===e.itemId)?.quantity??0)*line.quantity:0),0)
        return e.quantity+existing>(data.items.find(i=>i.id===e.itemId)?.quantity??0)
      })
      return <article key={kit.id}>{kit.featured&&<span className="ready-kit-badge">Destaque</span>}<div className="ready-kit-image">{image&&<img src={image} alt={kit.name} loading="lazy"/>}</div><h3>{kit.name}</h3><p>{kit.description}</p><ul>{kit.entries.map(e=><li key={e.itemId}><strong>{e.quantity}×</strong> {data.items.find(i=>i.id===e.itemId)?.name}</li>)}</ul><div className="ready-kit-prices">{kit.pricePoints>0&&<strong>{kit.pricePoints.toLocaleString("pt-BR")} pts</strong>}{kit.priceCash>0&&<span>{cash(kit.priceCash)}</span>}</div><button disabled={!price||unavailable} onClick={()=>{cart.addItem({itemId:`kit:${kit.id}`,name:kit.name,type:"ready_kit",value:kit.priceCash,pricePoints:kit.pricePoints,priceCash:kit.priceCash,image,mode,kitContents:readyKitContents(kit)},1);cart.openDrawer()}}>{unavailable?"Estoque insuficiente":!price?"Pagamento indisponível":"Adicionar kit ao carrinho"}</button></article>
    })}</div>}
  </section>
}
