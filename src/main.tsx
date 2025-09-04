import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { loadSettings, onSettingsChanged, type Settings } from './settings'
import { generateRandomLocalPart, normalizeDomain } from './utils/random'

// Hàm sẽ chạy trong context của trang web (không truy cập biến ngoài)
function fillEmailInPage(email: string) {
  const el =
    document.querySelector<HTMLInputElement>('#register-email') ||
    document.querySelector<HTMLInputElement>('input[name="email"][data-dan-component="email-field--input"]')

  if (!el) {
    alert('Không tìm thấy ô email (#register-email). Hãy mở đúng trang Registration.')
    return
  }

  // set value + fire events để React/Chakra nhận biết thay đổi
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  if (nativeSetter) {
    nativeSetter.call(el, email)
  } else {
    (el as HTMLInputElement).value = email
  }

  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))

  // focus để user thấy ngay
  el.focus()
}

async function execInActiveTab(fn: (...args: any[]) => void, args: any[] = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    alert('Không tìm thấy tab đang hoạt động.')
    return
  }
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
    const domain = normalizeDomain(r.emailDomain || '@example.com')
    const email = `${localPart}${domain}`

    // (tuỳ chọn) kiểm tra đang ở đúng trang
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const expectedHost = 'www.bathandbodyworks.com'
    if (!tab?.url?.includes('/registration') || !tab.url.includes(expectedHost)) {
      const go = confirm(
        'Tab hiện tại không phải trang Registration của B&BW. Bạn có muốn tiếp tục chích email vào trang hiện tại không?'
      )
      if (!go) return
    }

    await execInActiveTab(fillEmailInPage, [email])
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
      <h1 style={{ margin: 0, fontSize: 18 }}>BBW Helper</h1>
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
