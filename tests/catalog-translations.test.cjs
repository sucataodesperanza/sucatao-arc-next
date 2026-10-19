const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const ctx={exports:{},require}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/catalog-translations.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx)
const {translationRecordId,validateTranslatedName,applyCatalogTranslations}=ctx.exports
test('manual names override upstream names without changing original English, identity or stock metadata',()=>{
 const original=[{id:'weapon-1',name:'Upstream Name',name_en:'Original Name',rarity:'Rare'},{id:'herbal_bandage',name:'Atadura de Ervas'}]
 const result=applyCatalogTranslations(original,[{itemId:'weapon-1',name:'Nome revisado'}])
 assert.equal(result[0].name,'Nome revisado')
 assert.equal(result[0].name_en,'Original Name')
 assert.equal(result[0].id,'weapon-1')
 assert.equal(result[0].rarity,'Rare')
 assert.equal(original[0].name,'Upstream Name')
 assert.equal(result[1].name,'Atadura de Ervas')
 assert.equal(applyCatalogTranslations([{id:'weapon-1',name:'Changed Again'}],[{itemId:'weapon-1',name:'Nome revisado'}])[0].name,'Nome revisado')
})
test('manual translation records are stable and distinct and names are validated',()=>{
 assert.equal(translationRecordId('same'),translationRecordId('same'))
 assert.notEqual(translationRecordId('same'),translationRecordId('other'))
 assert.match(translationRecordId('same'),/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/)
 assert.equal(validateTranslatedName('  Águia-Pescadora IV  '),'Águia-Pescadora IV')
 for(const input of ['', ' ', null, 20, 'a'.repeat(201),'name\nline'])assert.throws(()=>validateTranslatedName(input))
})
