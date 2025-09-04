// src/injected/dom-helpers.ts

// (tuỳ chọn) type cho API để IDE gợi ý
export type DomApi = {
    setVal: (selector: string, value: string) => boolean
    setSelect: (selector: string, value: string) => boolean
    setCheckbox: (selector: string, desired: boolean) => boolean
    clickButton: (opts?: { selector?: string; text?: string; timeoutMs?: number }) => boolean
}

// Khai báo để TypeScript biết có gắn vào window
declare global {
    interface Window {
        __bbwDom: DomApi
    }
}

(function attachHelpers() {
    const setVal: DomApi['setVal'] = (selector: string, value: string) => {
        const el = document.querySelector<HTMLInputElement>(selector)
        if (!el) return false
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        if (nativeSetter) nativeSetter.call(el, value)
        else el.value = value
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return true
    }

    const setSelect: DomApi['setSelect'] = (selector: string, value: string) => {
        const el = document.querySelector<HTMLSelectElement>(selector)
        if (!el) return false
        el.value = value
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return true
    }

    const setCheckbox: DomApi['setCheckbox'] = (selector: string, checked: boolean) => {
        const input = document.querySelector<HTMLInputElement>(selector);
        if (!input || input.type !== 'checkbox') return false;
        if (input.disabled) return false;

        const label = input.closest('label.chakra-checkbox') as HTMLLabelElement | null;
        const control = label?.querySelector<HTMLElement>('.chakra-checkbox__control') || null;

        const isOk = () => input.checked === checked;

        // helper to click element with realistic sequence
        const clickLikeHuman = (el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const opts = { bubbles: true, cancelable: true, composed: true };
            el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: cx, clientY: cy, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
            el.dispatchEvent(new MouseEvent('mousedown', { ...opts, clientX: cx, clientY: cy, button: 0 }));
            el.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: cx, clientY: cy, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
            el.dispatchEvent(new MouseEvent('mouseup', { ...opts, clientX: cx, clientY: cy, button: 0 }));
            el.dispatchEvent(new MouseEvent('click', { ...opts, clientX: cx, clientY: cy, button: 0 }));
        };

        // 0) Bring into view (some UIs ignore offscreen clicks)
        (label || control || input).scrollIntoView({ block: 'center', inline: 'center' });

        // Try steps with short retries (React state can lag)
        let tries = 0;
        const tryOnce = () => {
            // A) Preferred: click the label (toggles the input)
            if (!isOk() && label) clickLikeHuman(label);
            if (isOk()) return true;

            // B) Click the visible control box
            if (!isOk() && control) clickLikeHuman(control);
            if (isOk()) return true;

            // C) Keyboard toggle on the input (Space)
            if (!isOk()) {
                input.focus();
                input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }));
            }
            if (isOk()) return true;

            // D) Last resort: set checked + fire input/change
            if (!isOk()) {
                const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
                if (nativeSetter) nativeSetter.call(input, checked);
                else input.checked = checked;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }

            return isOk();
        };

        if (tryOnce()) return true;

        // Poll a few times in case state is async
        const timer = setInterval(() => {
            if (isOk() || tries++ > 6) clearInterval(timer);
            else tryOnce();
        }, 120);

        return true;
    };

    const isEnabledButton = (btn: Element) => {
        const disabledAttr = btn.getAttribute('disabled')
        const ariaDisabled = btn.getAttribute('aria-disabled')
        const busy = btn.getAttribute('aria-busy')
        return !disabledAttr && ariaDisabled !== 'true' && busy !== 'true'
    }

    const clickButton: DomApi['clickButton'] = ({ selector, text = 'Create Account', timeoutMs = 5000 } = {}) => {
        const deadline = Date.now() + timeoutMs

        const byText = (t: string) => {
            const needle = (t || '').trim().toLowerCase()
            const nodes = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], input[type="submit"]'))
            // ưu tiên button[type=submit] có text khớp
            let found = nodes.find(el =>
                el.tagName.toLowerCase() === 'button' &&
                (el.getAttribute('type') || '').toLowerCase() === 'submit' &&
                (el.textContent || '').trim().toLowerCase().includes(needle)
            )
            if (found) return found
            return nodes.find(el => (el.textContent || '').trim().toLowerCase().includes(needle)) || null
        }

        const locate = () => {
            let el: HTMLElement | null = null
            if (selector) el = document.querySelector<HTMLElement>(selector)
            if (!el && text) el = byText(text)
            if (!el) el = document.querySelector<HTMLElement>('form button[type="submit"], form [role="button"][type="submit"], form input[type="submit"]')
            return el
        }

        const tryClick = () => {
            const btn = locate()
            console.log('Located button:', btn)
            if (!btn) return false
            if (!isEnabledButton(btn)) return false
            console.log('Clicking button', btn, btn.textContent)
            btn.click()
            return true
        }

        if (tryClick()) return true
        const timer = setInterval(() => {
            if (Date.now() > deadline) { clearInterval(timer); return }
            if (tryClick()) clearInterval(timer)
        }, 120)
        return true
    }

    // Gắn API lên window
    window.__bbwDom = {
        setVal,
        setSelect,
        setCheckbox,
        clickButton 
    }
})()
