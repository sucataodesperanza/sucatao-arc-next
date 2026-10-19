const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const ctx={exports:{},require:id=>({__esModule:true,default:require('../src/data/item-stack-sizes.json')})}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/stack-sales.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx)
const {saleStackSize,stackSaleOffer,prepareStackPurchase}=ctx.exports
test('API stack sizes take precedence and quantity/prices represent complete stacks',()=>{
 const item={id:'bandage',name:'Atadura renomeada',stackSize:1,quantity:14,pricePoints:100,priceCash:0.3,weightKg:0.2}
 assert.equal(saleStackSize(item),5)
 const offer=stackSaleOffer(item)
 assert.equal(offer.quantity,2)
 assert.equal(offer.pricePoints,500)
 assert.equal(offer.priceCash,1.5)
 assert.equal(offer.weightKg,1)
 const purchase=prepareStackPurchase(item,{itemId:offer.id,quantity:2,mode:'cash',priceCash:1.5})
 assert.equal(purchase.quantity,10)
 assert.equal(Math.round(purchase.priceCash*purchase.quantity*100),300)
 assert.equal(stackSaleOffer({...item,quantity:4}).quantity,0)
 assert.throws(()=>prepareStackPurchase(item,{itemId:'stack:bandage:1',quantity:1,mode:'cash',priceCash:0.3}))
 assert.throws(()=>prepareStackPurchase(item,{itemId:offer.id,quantity:1,mode:'cash',priceCash:0.3}))
 assert.throws(()=>prepareStackPurchase(item,{itemId:offer.id,quantity:1.5,mode:'cash',priceCash:1.5}))
})
test('unstackable items sell by one and unknown limits cannot create a sale',()=>{
 const item={id:'cerulean-stencil',name:'Estampa',quantity:3,priceCash:2.2,pricePoints:22000}
 assert.equal(saleStackSize(item),1)
 const offer=stackSaleOffer(item)
 assert.equal(offer.quantity,3)
 assert.equal(offer.priceCash,2.2)
 assert.equal(prepareStackPurchase(item,{itemId:offer.id,quantity:2,mode:'points',pricePoints:22000}).quantity,2)
 assert.equal(stackSaleOffer({id:'unknown-unverified',name:'Unknown'}),null)
 assert.equal(saleStackSize({id:'furniture-no-stack',name:'Móvel',type:'Furniture'}),1)
 assert.equal(saleStackSize({id:'remapped-id',name:'Traduzido',nameEn:'Bandage'}),5)
 assert.throws(()=>prepareStackPurchase({...item,isWeapon:true},{itemId:offer.id,quantity:1,mode:'cash',priceCash:2.2}))
})
