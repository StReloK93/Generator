import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { translations } from '@/stores/i18nStore'

function getAllVueFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      getAllVueFiles(fullPath, fileList)
    } else if (file.endsWith('.vue')) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        getAllTsFiles(fullPath, fileList)
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

describe('Code Quality & Strict Rules Audits', () => {
  const srcDir = path.resolve(__dirname, '../../src')
  const vueFiles = getAllVueFiles(srcDir)
  const tsFiles = getAllTsFiles(srcDir)
  const allSourceFiles = [...vueFiles, ...tsFiles]

  it('all Vue components in src/components should be referenced or exported', () => {
    const componentsDir = path.join(srcDir, 'components')
    const componentFiles = getAllVueFiles(componentsDir)

    const allCode = allSourceFiles
      .map(f => fs.readFileSync(f, 'utf-8'))
      .join('\n')

    const unreferenced: string[] = []

    for (const compPath of componentFiles) {
      const compName = path.basename(compPath, '.vue')
      // Exclude base UI library components which are part of standard design system
      if (compPath.includes('src\\components\\ui') || compPath.includes('src/components/ui') ||
          compPath.includes('src\\components\\svg') || compPath.includes('src/components/svg')) {
        continue
      }

      const occurrences = (allCode.match(new RegExp(`\\b${compName}\\b`, 'g')) || []).length
      if (occurrences <= 1) {
        unreferenced.push(compName)
      }
    }

    expect(unreferenced).toEqual([])
  })

  it('no Vue components should contain emoji icons in templates (Must use Lucide SVG icons per rule)', () => {
    const emojiRegex = /\p{Extended_Pictographic}/gu
    const violations: { file: string; line: number; text: string }[] = []

    for (const file of vueFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      lines.forEach((lineText: string, idx: number) => {
        // Exclude comments
        if (lineText.trim().startsWith('<!--') || lineText.trim().startsWith('//')) return
        const matches = lineText.match(emojiRegex)
        if (matches) {
          violations.push({
            file: path.relative(srcDir, file),
            line: idx + 1,
            text: lineText.trim(),
          })
        }
      })
    }

    if (violations.length > 0) {
      console.error('❌ Emojis found in Vue components:', violations)
    }

    expect(violations).toEqual([])
  })

  it('every t(...) and $t(...) call in all Vue and TS files must reference an existing key in i18nStore', () => {
    const keyRegex = /(?:^|[^a-zA-Z0-9_])(?:\$t|t)\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g
    const enDict = translations.en as Record<string, string>
    const missingKeys: { file: string; key: string }[] = []

    for (const file of allSourceFiles) {
      if (file.includes('i18nStore.ts') || file.includes('translations.test.ts') || file.includes('codeQuality.test.ts')) continue
      const content = fs.readFileSync(file, 'utf-8')
      let match: RegExpExecArray | null

      while ((match = keyRegex.exec(content)) !== null) {
        const key = match[1]
        // Ignore dynamic parameters or variable calls
        if (!key || key.includes('${')) continue
        if (!(key in enDict)) {
          missingKeys.push({ file: path.relative(srcDir, file), key })
        }
      }
    }

    if (missingKeys.length > 0) {
      console.error('❌ Missing i18n keys referenced in code:', missingKeys)
    }

    expect(missingKeys).toEqual([])
  })
})
