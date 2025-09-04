import { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../settings'

type Tab = 'register' | 'buy'

function App() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [savedTick, setSavedTick] = useState<number>(0)
    const [tab, setTab] = useState<Tab>('register')

    useEffect(() => {
        loadSettings().then(s => { setSettings(s); setLoading(false) })
    }, [])

    const canSave = useMemo(() => !loading && !saving, [loading, saving])

    const handleSave = async () => {
        setSaving(true)
        try {
            await saveSettings(settings)
            setSavedTick(Date.now())
        } finally {
            setSaving(false)
        }
    }
    const handleReset = () => setSettings(DEFAULT_SETTINGS)

    if (loading) return <div style={{ padding: 16 }}>Loading…</div>

    return (
        <div style={{ fontFamily: 'system-ui, Arial', padding: 16, maxWidth: 780 }}>
            <h1 style={{ fontSize: 20, margin: '0 0 12px' }}>Extension Settings</h1>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                    onClick={() => setTab('register')}
                    style={{
                        padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd',
                        background: tab === 'register' ? '#eef' : '#fff'
                    }}>
                    Register
                </button>
                <button
                    onClick={() => setTab('buy')}
                    style={{
                        padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd',
                        background: tab === 'buy' ? '#eef' : '#fff'
                    }}>
                    Buy
                </button>
            </div>

            {tab === 'register' && (
                <div>
                    <h2 style={{ fontSize: 16, margin: '8px 0' }}>Register Settings</h2>
                    <label style={{ display: 'block', marginTop: 10, fontWeight: 600 }}>
                        numRegistration
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={settings.register.numRegistration}
                        onChange={e => setSettings(s => ({
                            ...s, register: { ...s.register, numRegistration: Number(e.target.value || 0) }
                        }))}
                        style={{ padding: 6, width: 220 }}
                    />

                    <label style={{ display: 'block', marginTop: 10, fontWeight: 600 }}>
                        emailDomain
                    </label>
                    <input
                        type="text"
                        value={settings.register.emailDomain}
                        onChange={e => setSettings(s => ({
                            ...s, register: { ...s.register, emailDomain: e.target.value }
                        }))}
                        style={{ padding: 6, width: 220 }}
                        placeholder="@gmail.com"
                    />

                    <label style={{ display: 'block', marginTop: 10, fontWeight: 600 }}>
                        randomFirstNames
                    </label>
                    <textarea
                        rows={5}
                        value={settings.register.randomFirstNames}
                        onChange={e => setSettings(s => ({
                            ...s,
                            register: { ...s.register, randomFirstNames: e.target.value }
                        }))}
                        style={{ width: '100%', padding: 8 }}
                    />

                    <label style={{ display: 'block', marginTop: 10, fontWeight: 600 }}>
                        randomLastNames
                    </label>
                    <textarea
                        rows={5}
                        value={settings.register.randomLastNames}
                        onChange={e => setSettings(s => ({
                            ...s,
                            register: { ...s.register, randomLastNames: e.target.value }
                        }))}
                        style={{ width: '100%', padding: 8 }}
                    />

                    <label style={{ display: 'block', marginTop: 10, fontWeight: 600 }}>
                        randomUSZipCodes
                    </label>
                    <textarea
                        rows={5}
                        value={settings.register.randomUSZipCodes}
                        onChange={e => setSettings(s => ({
                            ...s,
                            register: { ...s.register, randomUSZipCodes: e.target.value }
                        }))}
                        style={{ width: '100%', padding: 8 }}
                    />

                    <label style={{ display: 'block', marginTop: 10, fontWeight: 600 }}>
                        randomUSAreaCodes
                    </label>
                    <textarea
                        rows={5}
                        value={settings.register.randomUSAreaCodes}
                        onChange={e => setSettings(s => ({
                            ...s,
                            register: { ...s.register, randomUSAreaCodes: e.target.value }
                        }))}
                        style={{ width: '100%', padding: 8 }}
                    />

                    <label style={{ display: 'block', marginTop: 10, fontWeight: 600 }}>
                        password
                    </label>
                    <input
                        type="password"
                        value={settings.register.password}
                        onChange={e => setSettings(s => ({
                            ...s, register: { ...s.register, password: e.target.value }
                        }))}
                        style={{ padding: 6, width: 220 }}
                        placeholder="••••••••"
                    />

                    <label style={{ display: 'block', marginTop: 10, fontWeight: 600 }}>
                        Date of Birth - Month (Zero base)
                    </label>
                    <input
                        type="text"
                        value={settings.register.dobMonth}
                        onChange={e => setSettings(s => ({
                            ...s, register: { ...s.register, dobMonth: Number(e.target.value || 0) }
                        }))}
                        style={{ padding: 6, width: 120 }}
                        placeholder="MM"
                    />

                    <label style={{ display: 'block', marginTop: 10, fontWeight: 600 }}>
                        Date of Birth - Day
                    </label>
                    <input
                        type="text"
                        value={settings.register.dobDay}
                        onChange={e => setSettings(s => ({
                            ...s, register: { ...s.register, dobDay: Number(e.target.value || 0) }
                        }))}
                        style={{ padding: 6, width: 120 }}
                        placeholder="DD"
                    />
                </div>
            )}

            {tab === 'buy' && (
                <div>
                    <h2 style={{ fontSize: 16, margin: '8px 0' }}>Buy Settings</h2>

                    <label style={{ display: 'block', marginTop: 10, fontWeight: 600 }}>
                        promotionCodes
                    </label>
                    <textarea
                        rows={5}
                        value={settings.buy.promotionCodes}
                        onChange={e => setSettings(s => ({
                            ...s,
                            buy: { ...s.buy, promotionCodes: e.target.value }
                        }))}
                        style={{ width: '100%', padding: 8 }}
                    />

                    <label style={{ display: 'block', marginTop: 10, fontWeight: 600 }}>
                        giftCardCodes
                    </label>
                    <textarea
                        rows={5}
                        value={settings.buy.giftCardCodes}
                        onChange={e => setSettings(s => ({
                            ...s,
                            buy: { ...s.buy, giftCardCodes: e.target.value }
                        }))}
                        style={{ width: '100%', padding: 8 }}
                    />
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={handleSave} disabled={!canSave} style={{ padding: '8px 12px' }}>
                    {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={handleReset} disabled={saving} style={{ padding: '8px 12px' }}>
                    Reset to defaults
                </button>
                {!!savedTick && <span style={{ alignSelf: 'center', color: '#0a0' }}>Saved ✓</span>}
            </div>
        </div>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
