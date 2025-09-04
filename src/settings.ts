// --- types ---
export type RegisterSettings = {
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

export type Settings = {
  register: RegisterSettings
  buy: BuySettings
}

export const DEFAULT_SETTINGS: Settings = {
  register: {
    numRegistration: 1,
    emailDomain: "@gmail.com",
    randomFirstNames: `James
Robert
John
Michael
William
David
Richard
Joseph
Thomas
Charles
Christopher
Daniel
Matthew
Anthony
Mark
Elizabeth
Patricia
Jennifer
Linda
Barbara
Susan
Jessica
Sarah
Karen
Nancy
Lisa
Betty
Sandra
Ashley
Kimberly`,
    randomLastNames: `Smith
Johnson
Williams
Brown
Jones
Garcia
Miller
Davis
Rodriguez
Martinez
Hernandez
Lopez
Gonzalez
Wilson
Anderson
Thomas
Taylor
Moore
Jackson
Martin
Lee
Perez
Thompson
White
Harris
Sanchez
Clark
Ramirez
Lewis`,
    randomUSZipCodes: `10001
90001
60601
73301
94105
30301
33101
19103
80202
15222
02108
97204
75201
85001
48226`,
    randomUSAreaCodes: `212
213
305
312
415
469
646
702
703
718
971
206
214
512
617`,
    password: "@Haivan2025",
    dobMonth: 11,
    dobDay: 23,
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
            password: raw.password ?? DEFAULT_SETTINGS.register.password,
            dobMonth: raw.dobMonth ?? DEFAULT_SETTINGS.register.dobMonth,
            dobDay: raw.dobDay ?? DEFAULT_SETTINGS.register.dobDay,
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
