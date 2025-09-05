import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import {
  loadSettings,
  onSettingsChanged,
  type RegisterSettings,
  type Settings
} from './settings'
import { Log } from './utils/log'

const log = new Log()

// Hàm sẽ chạy trong context của trang web (không truy cập biến ngoài)
async function fillRegisterForm(registerSettings: RegisterSettings) {
  const api = window.__bbwDom
  if (!api) {
    alert('Dom Helper is not injected');
    return
  }

  const { printDebug, setVal, waitForSelector, setSelect, setCheckbox, clickButton, waitAndClick, waitForGone } = api
  printDebug("fillRegisterForm <- Enter", registerSettings)

  // Tách chuỗi thành array theo newline
  const splitLines = (s: string): string[] => {
    return s.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
  }

  // Sinh số ngẫu nhiên n chữ số
  const randomDigits = (n: number): string => {
    let out = ''
    for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10)
    return out
  }

  // Làm sạch local-part cho email (chỉ giữ ký tự hợp lệ)
  const slugifyLocalPart = (s: string): string => {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')     // chỉ giữ ký tự hợp lệ
      .replace(/^[._-]+|[._-]+$/g, '')    // bỏ ký tự đặc biệt đầu/cuối
      .slice(0, 64)                       // local-part tối đa 64 ký tự
  }

  // Sinh local-part random dựa vào settings (first/last names nếu có)
  const generateRandomLocalPart = (r: RegisterSettings): string => {
    const firsts = splitLines(r.randomFirstNames)
    const lasts = splitLines(r.randomLastNames)

    if (firsts.length || lasts.length) {
      const f = firsts.length ? firsts[Math.floor(Math.random() * firsts.length)] : ''
      const l = lasts.length ? lasts[Math.floor(Math.random() * lasts.length)] : ''
      const base = [f, l].filter(Boolean).join('.')
      const withRand = base ? `${base}${randomDigits(3)}` : `user${randomDigits(6)}`
      return slugifyLocalPart(withRand)
    }
    // fallback
    return slugifyLocalPart(`user${randomDigits(8)}`)
  }

  // Chuẩn hóa domain (bắt đầu bằng @)
  const normalizeDomain = (domain: string): string => {
    const d = domain.trim()
    if (!d) return '@example.com'
    return d.startsWith('@') ? d : `@${d}`
  }

  const pickRandom = (arr: string[]): string | null => {
    if (!arr.length) return null
    return arr[Math.floor(Math.random() * arr.length)]
  }

  const generatePhone = (areaCodes: string[]): string => {
    const area = pickRandom(areaCodes) ?? '781';

    // Prefix 3 số: chữ số đầu phải từ 2–9
    const first = Math.floor(Math.random() * 8) + 2; // 2–9
    const rest = randomDigits(2);
    const prefix = `${first}${rest}`;

    // 4 số cuối thoải mái
    const lineNumber = randomDigits(4);

    return `(${area}) ${prefix}-${lineNumber}`;
  };

  // Chuẩn bị dữ liệu
  const localPart = generateRandomLocalPart(registerSettings)
  const domain = normalizeDomain(registerSettings.emailDomain)
  const email = `${localPart}${domain}`
  printDebug(`Generated email: ${email}`)

  const firstName = pickRandom(splitLines(registerSettings.randomFirstNames)) ?? 'John'
  const lastName = pickRandom(splitLines(registerSettings.randomLastNames)) ?? 'Doe'
  const postalCode = pickRandom(splitLines(registerSettings.randomUSZipCodes)) ?? '10001'
  const phone = generatePhone(splitLines(registerSettings.randomUSAreaCodes))
  const password = registerSettings.password || '@Haivan2025'
  const dobMonth = registerSettings.dobMonth || 11
  const dobDay = registerSettings.dobDay || 23

  // Chờ #register-email loaded và set value
  printDebug(`Waiting for #register-email to appear…`)
  const emailEl = await waitForSelector('#register-email', { timeoutMs: 60000, mustBeEnabled: true })
  if (!emailEl) {
    printDebug(`Timeout waiting for #register-email; skip this loop.`)
    return
  }
  setVal('#register-email', email)
  printDebug(`Filling form for email: ${email}`)

  // Chờ các field enable rồi fill
  const fields = ['#firstName', '#lastName', '#postalCode', '#phone', '#password']
  const okAll = await Promise.all(
    fields.map(sel => waitForSelector(sel, { timeoutMs: 60000, mustBeEnabled: true }))
  )
  if (okAll.some(x => !x)) {
    printDebug(`Timeout waiting for inputs to be enabled; skip this loop.`)
    return
  }

  setVal('#firstName', firstName)
  setVal('#lastName', lastName)
  setVal('#postalCode', postalCode)
  setVal('#phone', phone)
  setVal('#password', password)
  setSelect('#birthday--month', dobMonth.toString())
  setSelect('#birthday--day', dobDay.toString())
  setCheckbox('#tac', true)
  printDebug(`Filled all fields.`)

  // Click Create Account (ưu tiên theo text; DOM helper của bạn đã hỗ trợ)
  // Nếu bạn chắc có selector riêng thì thêm selector: 'button[type="submit"]' chẳng hạn
  try {
    const clicked = clickButton({ text: 'Create Account', timeoutMs: 8000 })
    if (!clicked) {
      printDebug('Cannot find Create Account button to click; skip this loop.')
      return;
    }
  } catch (e) {
    printDebug('Error when clicking Create Account button; skip this loop.')
    return;
  }

  // Chờ Sign Out xuất hiện, click, rồi chờ Sign Out biến mất (nếu chưa phải vòng cuối)
  const signOutSel = '[data-dan-component="navlinks-signout"]'
  const signOutAppeared = await waitForSelector(signOutSel, { timeoutMs: 60000 })
  if (!signOutAppeared) {
    printDebug(`Sign Out did not appear within timeout.`)
  } else {
    const okClick = await waitAndClick(signOutSel, { timeoutMs: 60000, intervalMs: 200 })
    printDebug(`Click Sign Out => ${okClick ? 'OK' : 'FAILED'}`)
    const gone = await waitForGone(signOutSel, { timeoutMs: 60000, intervalMs: 200 })
    printDebug(`Sign Out gone => ${gone ? 'YES' : 'NO (timeout)'}`)
  }

  printDebug("fillRegisterForm -> Leave")
  return { ok: true, ts: Date.now() } // <<-- trả về để không còn result:null
}

async function execInActiveTab(fn: (...args: any[]) => any, args: any[] = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    alert('Không tìm thấy tab đang hoạt động.')
    return
  }

  try {
    // 1) inject helpers vào MAIN world
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['injected/dom-helpers.js'],
      world: 'ISOLATED',
    })

    // 2) tiêm trực tiếp hàm bạn muốn chạy, cũng ở MAIN world
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fn,        // 👈 TIÊM TRỰC TIẾP, KHÔNG BỌC WRAPPER
      args,
      world: 'ISOLATED',
    })

    log.debug('[execInActiveTab] results:', results)
  } catch (err) {
    log.debug('[execInActiveTab] scripting error:', (err as any)?.message || err)
    alert('Lỗi inject: ' + ((err as any)?.message || err))
  }
}



function App() {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    loadSettings().then(setSettings)
    return onSettingsChanged(setSettings)
  }, [])

  const openOptions = () => chrome.runtime.openOptionsPage()

  const waitForTabComplete = (tabId: number) =>
    new Promise<void>((resolve) => {
      const listener = (updatedTabId: number, info: any) => {
        log.debug(`Tab ${updatedTabId} updated: ${JSON.stringify(info)}`)
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
    })

  const onRegister = async () => {
    if (!settings) {
      return
    }

    const loops = Math.max(1, Number(settings.register.numRegistration || 1))
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      alert('Không tìm thấy tab đang hoạt động.');
      return
    }

    const tabId = tab.id
    log.debug(`Starting registration loop, total ${loops} accounts, tabId: ${tabId}`)

    for (let i = 0; i < loops; i++) {
      await chrome.tabs.update(tabId, { url: settings.register.registrationUrl })
      await waitForTabComplete(tabId)
      log.debug(`[${i + 1}/${loops}] - Navigated to registration page.`)

      await execInActiveTab(fillRegisterForm, [settings.register])
    }
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

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'BBW_LOG') {
    log.debug(msg.line)
  }
})