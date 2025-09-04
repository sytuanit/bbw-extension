import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { loadSettings, onSettingsChanged, type Settings } from './settings'
import {
  generateRandomLocalPart,
  normalizeDomain,
  splitLines,
  pickRandom,
  generatePhone,
} from './utils/random'

// Hàm sẽ chạy trong context của trang web (không truy cập biến ngoài)
function fillRegisterForm(values: {
  email: string
  firstName: string
  lastName: string
  postalCode: string
  phone: string
  password: string
  dobMonth: number
  dobDay: number
}) {
  const api = window.__bbwDom
  if (!api) { 
    alert('Helpers not injected'); 
    return 
  }
  const { setVal, setSelect, setCheckbox, clickButton  } = api

  setVal('#register-email', values.email)

  const waitAndFill = () => {
    const first = document.querySelector<HTMLInputElement>('#firstName')
    const last = document.querySelector<HTMLInputElement>('#lastName')
    const zip = document.querySelector<HTMLInputElement>('#postalCode')
    const phone = document.querySelector<HTMLInputElement>('#phone')
    const password = document.querySelector<HTMLInputElement>('#password')

    if (first && !first.disabled && last && !last.disabled && zip && !zip.disabled && phone && !phone.disabled && password && !password.disabled) {
      // 3. Các field đã enable → điền value
      setVal('#firstName', values.firstName)
      setVal('#lastName', values.lastName)
      setVal('#postalCode', values.postalCode)
      setVal('#phone', values.phone)
      setVal('#password', values.password)
      setSelect('#birthday--month', values.dobMonth.toString())
      setSelect('#birthday--day', values.dobDay.toString())
      setCheckbox('#tac', true)
      setTimeout(() => clickButton({ text: 'Create Account', timeoutMs: 5000 }), 1000);
      return true
    }
    return false
  }

  // Poll mỗi 300ms, tối đa 20 lần (~6 giây)
  let attempts = 0
  const timer = setInterval(() => {
    if (waitAndFill() || attempts > 20) {
      clearInterval(timer)
    }
    attempts++
  }, 1000)
}

async function execInActiveTab(fn: (...args: any[]) => void, args: any[] = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    alert('Không tìm thấy tab đang hoạt động.')
    return
  }
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['injected/dom-helpers.js'], // file build từ TS
  });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: fn,
    args,
  })
}

function App() {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    loadSettings().then(setSettings)
    return onSettingsChanged(setSettings)
  }, [])

  const openOptions = () => chrome.runtime.openOptionsPage()

  const onRegister = async () => {
    if (!settings) return
    const r = settings.register

    const localPart = generateRandomLocalPart(r)
    const domain = normalizeDomain(r.emailDomain)
    const email = `${localPart}${domain}`

    const firstName = pickRandom(splitLines(r.randomFirstNames)) ?? 'John'
    const lastName = pickRandom(splitLines(r.randomLastNames)) ?? 'Doe'
    const postal = pickRandom(splitLines(r.randomUSZipCodes)) ?? '10001'
    const phone = generatePhone(splitLines(r.randomUSAreaCodes))
    const password = r.password || '@Haivan2025'
    const dobMonth = r.dobMonth || 11
    const dobDay = r.dobDay || 23

    await execInActiveTab(fillRegisterForm, [{
      email,
      firstName,
      lastName,
      postalCode: postal,
      phone,
      password,
      dobMonth,
      dobDay
    }])
  }

  const onBuy = () => {
    const b = settings?.buy
    alert(
      `Buy clicked!\n` +
      `promotionCodes=${b?.promotionCodes.split(/\r?\n/).filter(Boolean).length} items\n` +
      `giftCardCodes=${b?.giftCardCodes.split(/\r?\n/).filter(Boolean).length} items`
    )
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, Arial', minWidth: 320 }}>
      <h1 style={{ margin: 0, fontSize: 18 }}>BBW Extension</h1>
      <p style={{ marginTop: 6, color: '#555' }}>Chọn chức năng:</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        <button onClick={onRegister} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer' }}>
          Register
        </button>
        <button onClick={onBuy} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer' }}>
          Buy
        </button>
      </div>

      <hr style={{ margin: '14px 0' }} />

      <button onClick={openOptions} style={{ padding: '8px 10px', borderRadius: 8 }}>
        Open Settings
      </button>

      <details style={{ marginTop: 10 }}>
        <summary>Preview settings</summary>
        <pre style={{ background: '#f6f6f6', padding: 8, whiteSpace: 'pre-wrap' }}>
          {settings ? JSON.stringify(settings, null, 2) : 'Loading settings…'}
        </pre>
      </details>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
