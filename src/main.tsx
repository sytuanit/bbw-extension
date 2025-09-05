import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import {
  loadSettings,
  onSettingsChanged,
  type Settings
} from './settings'
import { Log } from './utils/log'
import { register } from './flows/register'

const log = new Log()

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

    log.debug('execInActiveTab - results:', results)
  } catch (err) {
    log.debug('execInActiveTab - scripting error:', (err as any)?.message || err)
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

      await execInActiveTab(register, [settings.register])
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