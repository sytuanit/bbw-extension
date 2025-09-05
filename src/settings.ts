import firstNames from './data/first-names.txt?raw'
import lastNames from './data/last-names.txt?raw'
import usZipCodes from './data/zip-codes.txt?raw'
import usAreaCodes from './data/area-codes.txt?raw'

export type RegisterSettings = {
  registrationUrl: string
  numRegistration: number
  emailDomain: string
  randomFirstNames: string
  randomLastNames: string
  randomUSZipCodes: string
  randomUSAreaCodes: string
  password: string
  dobMonth: number
  dobDay: number
}

export type BuySettings = {
  promotionCodes: string
  giftCardCodes: string
}

export type CollectedData = {
  promotionCodes: string
}

export type Settings = {
  register: RegisterSettings
  buy: BuySettings
  collectedData: CollectedData
}

export const DEFAULT_SETTINGS: Settings = {
  register: {
    registrationUrl: "https://www.bathandbodyworks.com/registration",
    numRegistration: 1,
    emailDomain: "@gmail.com",
    randomFirstNames: firstNames,
    randomLastNames: lastNames,
    randomUSZipCodes: usZipCodes,
    randomUSAreaCodes: usAreaCodes,
    password: "@Haivan2025",
    dobMonth: 11,
    dobDay: 23,
  },
  buy: {
    promotionCodes: "",
    giftCardCodes: "",
  },
  collectedData: {
    promotionCodes: "",
  }
}

const KEY = 'userSettings'

export async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([KEY], (res) => {
      const raw = res[KEY]

      // --- Migration: dữ liệu cực cũ (phẳng) -> register ---
      if (raw && !('register' in raw) && !('buy' in raw) && !('collectedData' in raw)) {
        const migrated: Settings = {
          register: {
            registrationUrl: raw.registrationUrl ?? DEFAULT_SETTINGS.register.registrationUrl,
            numRegistration: raw.numRegistration ?? DEFAULT_SETTINGS.register.numRegistration,
            emailDomain: raw.emailDomain ?? DEFAULT_SETTINGS.register.emailDomain,
            randomFirstNames: raw.randomFirstNames ?? DEFAULT_SETTINGS.register.randomFirstNames,
            randomLastNames: raw.randomLastNames ?? DEFAULT_SETTINGS.register.randomLastNames,
            randomUSZipCodes: raw.randomUSZipCodes ?? DEFAULT_SETTINGS.register.randomUSZipCodes,
            randomUSAreaCodes: raw.randomUSAreaCodes ?? DEFAULT_SETTINGS.register.randomUSAreaCodes,
            password: raw.password ?? DEFAULT_SETTINGS.register.password,
            dobMonth: raw.dobMonth ?? DEFAULT_SETTINGS.register.dobMonth,
            dobDay: raw.dobDay ?? DEFAULT_SETTINGS.register.dobDay,
          },
          buy: { 
            promotionCodes: raw.promotionCodes ?? DEFAULT_SETTINGS.buy.promotionCodes,
            giftCardCodes: raw.giftCardCodes ?? DEFAULT_SETTINGS.buy.giftCardCodes,
          },
          collectedData: { 
            promotionCodes: raw.promotionCodes ?? DEFAULT_SETTINGS.collectedData.promotionCodes,
          }
        }
        resolve({ ...DEFAULT_SETTINGS, ...migrated })
        return
      }

      resolve({ ...DEFAULT_SETTINGS, ...(raw ?? {}) })
    })
  })
}

export async function saveSettings(s: Settings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [KEY]: s }, () => resolve())
  })
}

export function onSettingsChanged(cb: (s: Settings) => void): () => void {
  const handler: Parameters<typeof chrome.storage.onChanged.addListener>[0] =
    (changes, areaName) => {
      if (areaName !== 'sync') return
      const ch = changes[KEY]
      if (ch) {
        const next = { ...DEFAULT_SETTINGS, ...(ch.newValue ?? {}) } as Settings
        cb(next)
      }
    }
  chrome.storage.onChanged.addListener(handler)
  return () => chrome.storage.onChanged.removeListener(handler)
}
