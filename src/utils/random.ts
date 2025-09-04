// src/utils/random.ts

import type { RegisterSettings } from '../settings'

// Tách chuỗi thành array theo newline
export function splitLines(s: string): string[] {
  return s.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
}

// Sinh số ngẫu nhiên n chữ số
export function randomDigits(n: number): string {
  let out = ''
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10)
  return out
}

// Làm sạch local-part cho email (chỉ giữ ký tự hợp lệ)
export function slugifyLocalPart(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')     // chỉ giữ ký tự hợp lệ
    .replace(/^[._-]+|[._-]+$/g, '')    // bỏ ký tự đặc biệt đầu/cuối
    .slice(0, 64)                       // local-part tối đa 64 ký tự
}

// Sinh local-part random dựa vào settings (first/last names nếu có)
export function generateRandomLocalPart(r: RegisterSettings): string {
  const firsts = splitLines(r.randomFirstNames)
  const lasts  = splitLines(r.randomLastNames)

  if (firsts.length || lasts.length) {
    const f = firsts.length ? firsts[Math.floor(Math.random() * firsts.length)] : ''
    const l = lasts.length  ? lasts[Math.floor(Math.random() * lasts.length)]  : ''
    const base = [f, l].filter(Boolean).join('.')
    const withRand = base ? `${base}${randomDigits(3)}` : `user${randomDigits(6)}`
    return slugifyLocalPart(withRand)
  }
  // fallback
  return slugifyLocalPart(`user${randomDigits(8)}`)
}

// Chuẩn hóa domain (bắt đầu bằng @)
export function normalizeDomain(domain: string): string {
  const d = domain.trim()
  if (!d) return '@example.com'
  return d.startsWith('@') ? d : `@${d}`
}

export function pickRandom(arr: string[]): string | null {
  if (!arr.length) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generatePhone(areaCodes: string[]): string {
  const area = pickRandom(areaCodes) ?? '555'
  return `${area}${randomDigits(7)}`
}
