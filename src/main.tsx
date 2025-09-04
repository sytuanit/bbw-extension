import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { loadSettings, onSettingsChanged, type Settings } from './settings'

type Action = {
  key: 'register' | 'buy'
  label: string
  onClick: () => void
}

function App() {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    loadSettings().then(setSettings)
    return onSettingsChanged(setSettings)
  }, [])

  const actions: Action[] = [
    {
      key: 'register',
      label: 'Register',
      onClick: () => alert('Register clicked!')
    },
    {
      key: 'buy',
      label: 'Buy',
      onClick: () => alert('Buy clicked!')
    }
  ]

  const openOptions = () => chrome.runtime.openOptionsPage()

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, Arial', minWidth: 320 }}>
      <h1 style={{ margin: 0, fontSize: 18 }}>BBW Helper</h1>
      <p style={{ marginTop: 6, color: '#555' }}>
        Chọn chức năng bên dưới:
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        {actions.map(a => (
          <button
            key={a.key}
            onClick={a.onClick}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer' }}
          >
            {a.label}
          </button>
        ))}
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
