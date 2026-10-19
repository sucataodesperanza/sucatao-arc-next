const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const ctx={exports:{}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/ready-kits.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx)
const {validateReadyKit,allocateKitPrice,prepareReadyKitPurchase,readyKitContents}=ctx.exports
const kit={name:'20 curas verdes',pricePoints:1001,priceCash:9.99,active:true,featured:false,position:0,entries:[{itemId:'cura',quantity:20}]}
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
