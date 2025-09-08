import { type RegisterSettings } from '../settings'

export async function register(settings: RegisterSettings) {
    const api = window.__bbwDom
    if (!api) {
        alert('Dom Helper is not injected');
        return
    }

    const { printDebug, setVal, waitForSelector, setSelect, setCheckbox, clickButton, click, waitForGone } = api

    try {
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

        const saveSetting = (promotionCode: string) => {
            chrome.runtime.sendMessage({ type: 'PROMOTION_CODE_COLLECTED', data: promotionCode })
        }

        printDebug("register <- Enter", settings)

        // Chuẩn bị dữ liệu
        const localPart = generateRandomLocalPart(settings)
        const domain = normalizeDomain(settings.emailDomain)
        const email = `${localPart}${domain}`
        printDebug(`Generated email: ${email}`)

        const firstName = pickRandom(splitLines(settings.randomFirstNames)) ?? 'John'
        const lastName = pickRandom(splitLines(settings.randomLastNames)) ?? 'Doe'
        const postalCode = pickRandom(splitLines(settings.randomUSZipCodes)) ?? '10001'
        const phone = generatePhone(splitLines(settings.randomUSAreaCodes))
        const password = settings.password || '@Haivan2025'
        const dobMonth = settings.dobMonth - 1 || 11 // zero-based
        const dobDay = settings.dobDay || 23

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

        // Chờ My Reward Wallet xuất hiện (nếu có)
        const rewardWalletSel = '[data-dan-component="navlinks-wallet"]'
        const rewardWalletElem = await waitForSelector(rewardWalletSel, { timeoutMs: 60000 })
        if (rewardWalletElem) {
            await click(rewardWalletElem)
            printDebug(`Clicked My Rewards Wallet`)
            const promotionCodeSel = '[data-dan-component="copy-reward-code"]'
            const promotionCodeElem = await waitForSelector(promotionCodeSel, { timeoutMs: 60000 })
            if (promotionCodeElem) {
                const promotionCode = (promotionCodeElem?.textContent || '').trim();
                printDebug(`Promotion code: ${promotionCode ? promotionCode : '(not found)'}`)
                saveSetting(promotionCode)
                printDebug(`Saved promotion code to settings.`)
            } else {
                printDebug(`Promotion code element did not appear within timeout.`)
            }
        } else {
            printDebug(`My Reward Wallet did not appear within timeout.`)
        }

        // Chờ Sign Out xuất hiện, click, rồi chờ Sign Out biến mất (nếu chưa phải vòng cuối)
        const signOutSel = '[data-dan-component="navlinks-signout"]'
        const signOutElem = await waitForSelector(signOutSel, { timeoutMs: 60000 })
        if (signOutElem) {
            await click(signOutElem)
            printDebug(`Clicked Sign Out`)
            const gone = await waitForGone(signOutSel, { timeoutMs: 60000, intervalMs: 200 })
            printDebug(`Sign Out gone => ${gone ? 'YES' : 'NO (timeout)'}`)
        } else {
            printDebug(`Sign Out did not appear within timeout.`)
        }

        printDebug("register -> Leave")
        return { ok: true, ts: Date.now() } // <<-- trả về để không còn result:null

    } catch (error) {
        printDebug(`Error in register: ${error}`)
        return { ok: false, ts: Date.now() }
    }
}
