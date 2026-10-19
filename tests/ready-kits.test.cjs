const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const ctx={exports:{}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/ready-kits.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx)
const {validateReadyKit,allocateKitPrice,prepareReadyKitPurchase,readyKitContents,convertWeaponKit}=ctx.exports
const kit={name:'20 curas verdes',pricePoints:1001,priceCash:9.99,active:true,featured:false,position:0,entries:[{itemId:'cura',quantity:20}]}
test('legacy weapon kits become editable mixed kits without losing identity or components',()=>{
 const previous={id:'existing-id',name:'Meu kit',active:true,featured:true,position:4,draft:{weapon:{itemId:'arma',quantity:1},stock:{itemId:'coronha',quantity:1}}}
 const converted=convertWeaponKit(previous,new Map([['arma',{points:100,cash:2.5}],['coronha',{points:30,cash:1.2}]]))
 assert.equal(converted.id,previous.id)
 assert.equal(converted.name,previous.name)
 assert.equal(converted.featured,true)
 assert.equal(converted.position,4)
 assert.equal(converted.entries.length,2)
 assert.equal(converted.pricePoints,130)
 assert.equal(converted.priceCash,3.7)
 assert.equal(converted.active,true)
 const edited=validateReadyKit({...converted,entries:[...converted.entries,{itemId:'cura',quantity:7}]},new Set(['arma','coronha','cura']))
 assert.equal(edited.entries[2].quantity,7)
 assert.equal(convertWeaponKit(previous,new Map()).active,false)
})
test('ready kit validates catalogue, quantity and package prices',()=>{
 assert.equal(validateReadyKit(kit,new Set(['cura'])).entries[0].quantity,20)
 assert.equal(validateReadyKit({...kit,active:false,pricePoints:0,priceCash:0},new Set(['cura'])).active,false)
 for(const change of [{entries:[{itemId:'outro',quantity:20}]},{entries:[{itemId:'cura',quantity:0}]},{entries:[{itemId:'cura',quantity:1.5}]},{pricePoints:-1},{pricePoints:0,priceCash:0},{image:'javascript:alert(1)'},{entries:[...kit.entries,...kit.entries]}]) assert.throws(()=>validateReadyKit({...kit,...change},new Set(['cura'])))
})
test('package allocation keeps exact cents and quantities for mixed items and multiple kits',()=>{
 for(const total of [1,999,1001,100000]){
  const entries=[{itemId:'arma',quantity:20},{itemId:'cura',quantity:7}]
  const rows=allocateKitPrice(entries,total)
  assert.equal(rows.reduce((s,r)=>s+r.unitPrice*r.quantity,0),total)
  assert.equal(rows.reduce((s,r)=>s+r.quantity,0),27)
  assert.equal(rows.filter(r=>r.itemId==='arma').reduce((s,r)=>s+r.quantity*2,0),40)
  assert.equal(rows.reduce((s,r)=>s+r.unitPrice*r.quantity*2,0),total*2)
 }
})
test('checkout resolves two packages and rejects stale, disabled and forged package quotes',()=>{
 const saved={...kit,id:'kit-id'}
 const line={mode:'cash',quantity:2,priceCash:9.99,kitContents:readyKitContents(saved)}
 const rows=prepareReadyKitPurchase(saved,line)
 assert.equal(rows.reduce((s,r)=>s+r.quantity,0),40)
 assert.equal(Math.round(rows.reduce((s,r)=>s+r.unitPrice*r.quantity,0)*100),1998)
 assert.throws(()=>prepareReadyKitPurchase({...saved,active:false},line))
 assert.throws(()=>prepareReadyKitPurchase(saved,{...line,priceCash:0.01}))
 assert.throws(()=>prepareReadyKitPurchase({...saved,entries:[{itemId:'cura',quantity:10}]},line))
 assert.throws(()=>prepareReadyKitPurchase(undefined,line))
 assert.throws(()=>prepareReadyKitPurchase(saved,{...line,quantity:1.5}))
 const points=prepareReadyKitPurchase(saved,{mode:'points',quantity:2,pricePoints:1001,kitContents:readyKitContents(saved)})
 assert.equal(points.reduce((s,r)=>s+r.quantity*r.unitPrice,0),2002)
})
