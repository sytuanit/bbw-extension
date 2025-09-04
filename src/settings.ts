// --- types ---
export type RegisterSettings = {
  numRegistration: number
  emailDomain: string
  randomFirstNames: string
  randomLastNames: string
  randomUSZipCodes: string
  randomUSAreaCodes: string
}

export type BuySettings = {
  promotionCodes: string
  giftCardCodes: string
}

export type Settings = {
  register: RegisterSettings
  buy: BuySettings
}

export const DEFAULT_SETTINGS: Settings = {
  register: {
    numRegistration: 1,
    emailDomain: "@gmail.com",
    randomFirstNames: "",
    randomLastNames: "",
    randomUSZipCodes: "",
    randomUSAreaCodes: "",
  },
  buy: {
    promotionCodes: "",
    giftCardCodes: "",
  },
}

const KEY = 'userSettings'

export async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([KEY], (res) => {
      const raw = res[KEY]

      // --- Migration: dữ liệu cực cũ (phẳng) -> register ---
      if (raw && !('register' in raw) && !('buy' in raw)) {
        const migrated: Settings = {
          register: {
            numRegistration: raw.numRegistration ?? DEFAULT_SETTINGS.register.numRegistration,
            emailDomain: raw.emailDomain ?? DEFAULT_SETTINGS.register.emailDomain,
            randomFirstNames: raw.randomFirstNames ?? DEFAULT_SETTINGS.register.randomFirstNames,
            randomLastNames: raw.randomLastNames ?? DEFAULT_SETTINGS.register.randomLastNames,
            randomUSZipCodes: raw.randomUSZipCodes ?? DEFAULT_SETTINGS.register.randomUSZipCodes,
            randomUSAreaCodes: raw.randomUSAreaCodes ?? DEFAULT_SETTINGS.register.randomUSAreaCodes,
          },
          buy: { 
            promotionCodes: raw.promotionCodes ?? DEFAULT_SETTINGS.buy.promotionCodes,
            giftCardCodes: raw.giftCardCodes ?? DEFAULT_SETTINGS.buy.giftCardCodes,
          },
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
