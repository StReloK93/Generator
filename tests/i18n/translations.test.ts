import { describe, it, expect } from 'vitest'
import { translations, SUPPORTED_LOCALES } from '@/stores/i18nStore'
import fs from 'fs'
import path from 'path'

describe('i18n Translation Completeness & Parity Tests', () => {
  it('should define all supported locales (en, uz, ru)', () => {
    const codes = SUPPORTED_LOCALES.map(l => l.code)
    expect(codes).toContain('en')
    expect(codes).toContain('uz')
    expect(codes).toContain('ru')

    expect(translations.en).toBeDefined()
    expect(translations.uz).toBeDefined()
    expect(translations.ru).toBeDefined()
  })

  it('all keys present in English (en) dictionary must exist in Uzbek (uz)', () => {
    const enKeys = Object.keys(translations.en)
    const uzDict = translations.uz as Record<string, string>
    const missingInUz: string[] = []

    for (const key of enKeys) {
      if (!(key in uzDict) || typeof uzDict[key] !== 'string' || uzDict[key].trim() === '') {
        missingInUz.push(key)
      }
    }

    if (missingInUz.length > 0) {
      console.warn(`⚠️ [i18n] Uzbek (uz) da yetishmayotgan ${missingInUz.length} ta kalit:`, missingInUz.slice(0, 30))
    }

    expect(missingInUz).toEqual([])
  })

  it('all keys present in English (en) dictionary must exist in Russian (ru)', () => {
    const enKeys = Object.keys(translations.en)
    const ruDict = translations.ru as Record<string, string>
    const missingInRu: string[] = []

    for (const key of enKeys) {
      if (!(key in ruDict) || typeof ruDict[key] !== 'string' || ruDict[key].trim() === '') {
        missingInRu.push(key)
      }
    }

    if (missingInRu.length > 0) {
      console.warn(`⚠️ [i18n] Russian (ru) da yetishmayotgan ${missingInRu.length} ta kalit:`, missingInRu.slice(0, 30))
    }

    expect(missingInRu).toEqual([])
  })

  it('no translation value in any language should be an empty string', () => {
    for (const lang of ['en', 'uz', 'ru'] as const) {
      const dict = translations[lang] as Record<string, string>
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value).toBe('string')
        expect(value.trim().length, `Empty translation for key "${key}" in ${lang}`).toBeGreaterThan(0)
      }
    }
  })

  it('source code of i18nStore.ts should have zero duplicate keys within any locale', () => {
    const filePath = path.resolve(__dirname, '../../src/stores/i18nStore.ts')
    const content = fs.readFileSync(filePath, 'utf-8')

    // Find sections for en, uz, ru
    const enMatch = content.match(/en:\s*\{([\s\S]*?)\n\s*\},/)?.[1] || ''
    const uzMatch = content.match(/uz:\s*\{([\s\S]*?)\n\s*\},/)?.[1] || ''
    const ruMatch = content.match(/ru:\s*\{([\s\S]*?)\n\s*\}\s*\} as const/)?.[1] || ''

    const checkDuplicates = (sectionText: string, lang: string) => {
      const lines = sectionText.split('\n')
      const seen = new Map<string, number>()
      const duplicates: { key: string; line: number; prevLine: number }[] = []

      lines.forEach((lineText, idx) => {
        const match = lineText.match(/^\s*'([^']+)'\s*:/)
        if (match) {
          const key = match[1]
          if (seen.has(key)) {
            duplicates.push({ key, line: idx + 1, prevLine: seen.get(key)! })
          } else {
            seen.set(key, idx + 1)
          }
        }
      })
      if (duplicates.length > 0) {
        console.error(`Duplicate keys in ${lang}:`, duplicates)
      }
      return duplicates.map(d => d.key)
    }

    const enDups = checkDuplicates(enMatch, 'en')
    const uzDups = checkDuplicates(uzMatch, 'uz')
    const ruDups = checkDuplicates(ruMatch, 'ru')

    expect(enDups, `Duplicate keys in en: ${enDups.join(', ')}`).toEqual([])
    expect(uzDups, `Duplicate keys in uz: ${uzDups.join(', ')}`).toEqual([])
    expect(ruDups, `Duplicate keys in ru: ${ruDups.join(', ')}`).toEqual([])
  })
})
