import { type BuySettings } from '../settings'

export async function buy(settings: BuySettings) {

    const consumePromotionCode = (promotionCodes: string): {
        code: string | null; // mã đầu tiên (null nếu hết)
        rest: string;        // phần còn lại (không dòng trống đầu/cuối)
        list: string[];      // mảng còn lại
    } => {
        const list = (promotionCodes || '')
            .split(/\r?\n/)
            .map(s => s.trim())
            .filter(Boolean);

        const code = list.shift() ?? null;     // lấy mã đầu tiên
        const next = list.join('\n');          // ghép phần còn lại, KHÔNG dư \n

        return { code, rest: next, list };
    }

    const api = window.__bbwDom
    if (!api) {
        alert('Dom Helper is not injected');
        return
    }

    const { printDebug, waitForSelector, click, deepClick, setVal } = api
    printDebug("buy <- Enter", settings)

    const addToBagSel = '[data-dan-component="product-add-to-cart"]'
    const addToBagElem = await waitForSelector(addToBagSel, { timeoutMs: 3000 })
    if (addToBagElem) {
        await click(addToBagElem)
        printDebug(`Clicked Add to Bag`)
        if (settings.quantityPerBuy > 1) {
            const qtyIncreaseSel = '[data-dan-component="quantity-picker--increment-button"]'
            const qtyIncreaseElem = await waitForSelector(qtyIncreaseSel, { timeoutMs: 60000 })
            if (!qtyIncreaseElem) {
                printDebug('Không tìm thấy nút tăng số lượng. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            for (let i = 1; i < settings.quantityPerBuy; i++) {
                await deepClick(qtyIncreaseElem)
                printDebug(`Clicked tăng số lượng lên ${i + 1}/${settings.quantityPerBuy}`)
            }
        }
    } else { // Không tìm thấy nút Add to Bag
        const qtyInputSel = '[data-dan-component="quantity-picker--input"]'
        const qtyInputElem = await waitForSelector<HTMLInputElement>(qtyInputSel, { timeoutMs: 60000 })
        if (!qtyInputElem) {
            printDebug('Không tìm thấy nút Add to Bag cũng như input số lượng. Vui lòng mở trang sản phẩm và thử lại.')
            return { ok: false, ts: Date.now() }
        }
        const currentQty = parseInt(qtyInputElem.value || '1');
        printDebug(`Input số lượng hiện tại là ${currentQty}`)
        if (currentQty < settings.quantityPerBuy) {
            const qtyIncreaseSel = '[data-dan-component="quantity-picker--increment-button"]'
            const qtyIncreaseElem = await waitForSelector(qtyIncreaseSel, { timeoutMs: 60000 })
            if (!qtyIncreaseElem) {
                printDebug('Không tìm thấy nút tăng số lượng. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            for (let i = 1; i < settings.quantityPerBuy; i++) {
                await deepClick(qtyIncreaseElem)
                printDebug(`Clicked tăng số lượng lên ${i + 1}/${settings.quantityPerBuy}`)
            }
        } else if (currentQty > settings.quantityPerBuy) {
            const qtyDecreaseSel = '[data-dan-component="quantity-picker--decrement-button"]'
            const qtyDecreaseElem = await waitForSelector(qtyDecreaseSel, { timeoutMs: 60000 })
            if (!qtyDecreaseElem) {
                printDebug('Không tìm thấy nút giảm số lượng. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            for (let i = 1; i < currentQty - settings.quantityPerBuy + 1; i++) {
                await deepClick(qtyDecreaseElem)
                printDebug(`Clicked giảm số lượng xuống ${currentQty - i}/${settings.quantityPerBuy}`)
            }
        }
    }

    const cartSel = '[data-dan-component="mini-cart--icon-btn"]'
    const cartElem = await waitForSelector(cartSel, { timeoutMs: 60000 })
    if (!cartElem) {
        printDebug('Không tìm thấy nút Cart. Vui lòng mở trang sản phẩm và thử lại.')
        return { ok: false, ts: Date.now() }
    }

    await click(cartElem)
    printDebug(`Clicked Cart`)

    var hasAppliedPromotionCode = false;
    var appliedPromotionCode = '';
    var restPromotionCodes = '';
    const promotionCodeSel = '[data-dan-component="promo-field--input"]'
    const promotionCodeElem = await waitForSelector(promotionCodeSel, { timeoutMs: 60000 })
    if (promotionCodeElem) {
        const { code: code, rest: rest } = consumePromotionCode(settings.promotionCodes)
        if (code) {
            setVal(promotionCodeSel, code)
            printDebug(`Filled Promotion Code: ${code}, rest: ${rest}`)
            const applyBtnSel = '[data-dan-component="promo-field--btn"]'
            const applyBtnElem = await waitForSelector(applyBtnSel, { timeoutMs: 60000, mustBeEnabled: true })
            if (applyBtnElem) {
                await click(applyBtnElem)
                printDebug(`Clicked Apply Promotion Code button`)
                hasAppliedPromotionCode = true;
                appliedPromotionCode = code;
                restPromotionCodes = rest;
            }
        } else {
            printDebug(`No Promotion Code to use`)
        }
        
        const checkoutBtnSel = '[data-dan-component="cart-checkout-button"]'
        const checkoutBtnElem = await waitForSelector(checkoutBtnSel, { timeoutMs: 60000, mustBeEnabled: true })
        if (checkoutBtnElem) {
            await click(checkoutBtnElem)
            printDebug(`Clicked Checkout button`)
            if (hasAppliedPromotionCode) {
                chrome.runtime.sendMessage({
                    type: 'PROMOTION_CODE_CONSUMED', data: {
                        code: appliedPromotionCode,
                        rest: restPromotionCodes,
                    }
                })
            }
        }
    }

    printDebug("buy -> Leave")
    return { ok: true, ts: Date.now() } // <<-- trả về để không còn result:null
}