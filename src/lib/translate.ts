const GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
const CONCURRENCY = 5

type GoogleTranslateResponse = [Array<[string, string, ...unknown[]]>, ...unknown[]]

async function translateOne(text: string): Promise<string> {
  const params = new URLSearchParams({ client: "gtx", sl: "en", tl: "pt", dt: "t", q: text })

  const response = await fetch(`${GOOGLE_TRANSLATE_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Google Translate retornou ${response.status}`)
  }

  const json = (await response.json()) as GoogleTranslateResponse
  return json[0].map(segment => segment[0]).join("")
}

/**
 * Traduz textos em inglês para PT-BR via endpoint público (não-oficial) do
 * Google Tradutor. Sem chave/cadastro. Em caso de falha em algum texto, mantém
 * o original em inglês para aquele item (não derruba o sync inteiro).
 */
export async function translateToPtBr(texts: string[]): Promise<{ texts: string[]; translatedCount: number }> {
  const result: string[] = texts.map(t => t ?? "")
  let translatedCount = 0

  const pending = texts.map((t, i) => i).filter(i => texts[i] && texts[i].trim())

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY)
    const translations = await Promise.all(
      batch.map(async idx => {
        try {
          return await translateOne(texts[idx])
        } catch (error) {
          console.error("translateToPtBr error:", error)
          return null
        }
      })
    )
    batch.forEach((idx, j) => {
      const translation = translations[j]
      if (translation) {
        result[idx] = translation
        translatedCount += 1
      }
    })
  }

  return { texts: result, translatedCount }
}
