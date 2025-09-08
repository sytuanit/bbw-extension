import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import {
  loadSettings,
  onSettingsChanged,
  type Settings
} from './settings'
import { Log } from './utils/log'
import { register } from './flows/register'
import { buy } from './flows/buy'
import { Consts } from './utils/consts'
import { delay } from './utils/promis-helper'

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
  const settingsRef = useRef<Settings | null>(null)

  useEffect(() => {
    loadSettings().then(setSettings)
    return onSettingsChanged(setSettings)
  }, [])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    const handler = (msg: any) => {
      switch (msg?.type) {
        case Consts.Events.LOG_REQUESTED:
          log.debug(msg.data)
          break

        case Consts.Events.ALERT_REQUESTED:
          alert(msg.data)
          break

        case Consts.Events.PROMOTION_CODE_COLLECTED:
          {
            log.debug('Received message:', msg)
            const promotionCode = String(msg.data || '').trim()
            if (!promotionCode) return
            setSettings(prev => {
              if (!prev) return prev
              const next = {
                ...prev,
                buy: {
                  ...prev.buy,
                  promotionCodes:
                    (prev.buy.promotionCodes ? prev.buy.promotionCodes + '\n' : '') + promotionCode,
                },
              };
              settingsRef.current = next;
              chrome.storage.sync.set({ userSettings: next })
              log.debug(`Saved promotion code to settings.`)
              return next;
            });
          }
          break

        case Consts.Events.BUY_SUCCESS:
          {
            log.debug('Received message:', msg)
            const consumedPromotionCode = msg.data.consumedPromotionCode
            const restPromotionCodes = msg.data.restPromotionCodes
            const consumedGiftCard = msg.data.consumedGiftCard
            const restGiftCards = msg.data.restGiftCards
            log.debug(`Promotion code consumedPromotionCode: ${consumedPromotionCode}, restPromotionCodes: ${restPromotionCodes}, consumedGiftCard: ${consumedGiftCard}, restGiftCards: ${restGiftCards}`)
            setSettings(prev => {
              if (!prev) return prev
              const next = {
                ...prev,
                buy: {
                  ...prev.buy,
                  promotionCodes: restPromotionCodes,
                  giftCardCodes: restGiftCards
                },
                history: {
                  ...prev.history,
                  promotionCodes: (prev.history.promotionCodes ? prev.history.promotionCodes + '\n' : '') + consumedPromotionCode,
                }
              } as Settings
              settingsRef.current = next
              chrome.storage.sync.set({ userSettings: next })
              return next;
            });
            log.debug(`Saved promotion code to settings.`)
          }
          break

        default:
          break
      }
    }

    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
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
      alert('Settings not loaded yet, please wait a moment and try again.')
      return
    }

    if (!settings.register.registrationUrl) {
      alert('Registration URL is not set.')
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

  const onBuy = async () => {
    if (!settings) {
      return
    }

    if (!settings.buy.productUrl) {
      alert('Product URL is not set.')
      return
    }

    const loops = Math.max(1, Number(settings.buy.numBuy || 1))
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      alert('Không tìm thấy tab đang hoạt động.');
      return
    }

    const tabId = tab.id
    log.debug(`Starting buy loop, total ${loops} buys, tabId: ${tabId}`)

    for (let i = 0; i < loops; i++) {
      const s = settingsRef.current!;
      await chrome.tabs.update(tabId, { url: s.buy.productUrl })
      await waitForTabComplete(tabId)
      log.debug(`[${i + 1}/${loops}] - Navigated to buy page.`)
      await execInActiveTab(buy, [s.buy])
      await delay(1000);
    }
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
