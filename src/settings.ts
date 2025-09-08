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
  productUrl: string
  numBuy: number
  quantityPerBuy: number
  giftCardCodes: string
  promotionCodes: string
  // Shipping address
  firstName: string
  lastName: string
  address1: string
  address2: string
  country: string
  city: string
  state: string
  zipCode: string
  phone: string
  // Card
  cardNumber: string
  cardHolderName: string
  cardExpirationDateMonth: number
  cardExpirationDateYear: number
  cardSecurityCode: string
}

export type Histories = {
  promotionCodes: string
}

export type Settings = {
  register: RegisterSettings
  buy: BuySettings
  history: Histories
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
    dobMonth: 12,
    dobDay: 23,
  },
  buy: {
    productUrl: "https://www.bathandbodyworks.com/p/in-the-stars-fine-fragrance-mist-028017806",
    numBuy: 1,
    quantityPerBuy: 2,
    giftCardCodes: "",
    promotionCodes: "",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    country: "US",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    cardNumber: "",
    cardHolderName: "",
    cardExpirationDateMonth: 9,
    cardExpirationDateYear: 2025,
    cardSecurityCode: ""
  },
  history: {
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
            productUrl: raw.productUrl ?? DEFAULT_SETTINGS.buy.productUrl,
            numBuy: raw.numBuy ?? DEFAULT_SETTINGS.buy.numBuy,
            quantityPerBuy: raw.quantityPerBuy ?? DEFAULT_SETTINGS.buy.quantityPerBuy,
            giftCardCodes: raw.giftCardCodes ?? DEFAULT_SETTINGS.buy.giftCardCodes,
            promotionCodes: raw.promotionCodes ?? DEFAULT_SETTINGS.buy.promotionCodes,
            firstName: raw.firstName ?? DEFAULT_SETTINGS.buy.firstName,
            lastName: raw.lastName ?? DEFAULT_SETTINGS.buy.lastName,
            address1: raw.address1 ?? DEFAULT_SETTINGS.buy.address1,
            address2: raw.address2 ?? DEFAULT_SETTINGS.buy.address2,
            country: raw.country ?? DEFAULT_SETTINGS.buy.country,
            city: raw.city ?? DEFAULT_SETTINGS.buy.city,
            state: raw.state ?? DEFAULT_SETTINGS.buy.state,
            zipCode: raw.zipCode ?? DEFAULT_SETTINGS.buy.zipCode,
            phone: raw.phone ?? DEFAULT_SETTINGS.buy.phone,
            cardNumber: raw.cardNumber ?? DEFAULT_SETTINGS.buy.cardNumber,
            cardHolderName: raw.cardHolderName ?? DEFAULT_SETTINGS.buy.cardHolderName,
            cardExpirationDateMonth: raw.cardExpirationDateMonth ?? DEFAULT_SETTINGS.buy.cardExpirationDateMonth,
            cardExpirationDateYear: raw.cardExpirationDateYear ?? DEFAULT_SETTINGS.buy.cardExpirationDateYear,
            cardSecurityCode: raw.cardSecurityCode ?? DEFAULT_SETTINGS.buy.cardSecurityCode,
          },
          history: {
            promotionCodes: raw.promotionCodes ?? DEFAULT_SETTINGS.history.promotionCodes,
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
