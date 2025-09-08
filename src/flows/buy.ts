import { type BuySettings } from '../settings'

export async function buy(settings: BuySettings) {
    const api = window.__bbwDom
    if (!api) {
        alert('Dom Helper is not injected');
        return
    }

    const { delay, printDebug, selectElem, waitForSelector, click, deepClick, setVal, setSelect, setCheckbox } = api
    printDebug("buy <- Enter", settings)

    try {
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

        // Click Add To Bag
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

        // View Cart
        const cartSel = '[data-dan-component="mini-cart--icon-btn"]'
        const cartElem = await waitForSelector(cartSel, { timeoutMs: 60000 })
        if (!cartElem) {
            printDebug('Không tìm thấy nút Cart. Vui lòng mở trang sản phẩm và thử lại.')
            return { ok: false, ts: Date.now() }
        }

        await click(cartElem)
        printDebug(`Clicked Cart`)

        // Click Checkout
        const checkoutBtnSel = '[data-dan-component="cart-checkout-button"]'
        const checkoutBtnElem = await waitForSelector(checkoutBtnSel, { timeoutMs: 60000, mustBeEnabled: true })
        if (!checkoutBtnElem) {
            printDebug('Không tìm thấy nút Checkout. Vui lòng mở trang sản phẩm và thử lại.')
            return { ok: false, ts: Date.now() }
        }

        await click(checkoutBtnElem)
        printDebug(`Clicked Checkout button`)

        // Click Go To Billing
        const goToBillingBtnSel = '[data-dan-component="checkout-cta--button"] button'
        const goToBillingBtnElem = await waitForSelector(goToBillingBtnSel, { timeoutMs: 60000, mustBeEnabled: true })
        if (!goToBillingBtnElem) {
            printDebug('Không tìm thấy nút Go To Billing. Vui lòng mở trang sản phẩm và thử lại.')
            return { ok: false, ts: Date.now() }
        }

        const firstNameInputSel = '[data-dan-component="firstName-field--input"]'
        const firstNameInputElem = await waitForSelector(firstNameInputSel, { timeoutMs: 60000 })
        if (firstNameInputElem) { // Need to input shipping address
            printDebug(`Filling shipping address...`)

            setVal(firstNameInputSel, settings.firstName)
            printDebug(`Filled First Name: ${settings.firstName}`)

            const lastNameInputSel = '[data-dan-component="lastName-field--input"]'
            const lastNameInputElem = await waitForSelector(lastNameInputSel, { timeoutMs: 60000 })
            if (!lastNameInputElem) {
                printDebug('Không tìm thấy input Last Name. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setVal(lastNameInputSel, settings.lastName)
            printDebug(`Filled Last Name: ${settings.lastName}`)

            const address1InputSel = '[data-dan-component="address1-field--input"]'
            const address1InputElem = await waitForSelector(address1InputSel, { timeoutMs: 60000 })
            if (!address1InputElem) {
                printDebug('Không tìm thấy input Address 1. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setVal(address1InputSel, settings.address1)
            printDebug(`Filled Address 1: ${settings.address1}`)

            const address2InputSel = '[data-dan-component="address2-field--input"]'
            const address2InputElem = await waitForSelector(address2InputSel, { timeoutMs: 60000 })
            if (address2InputElem) {
                setVal(address2InputSel, settings.address2)
                printDebug(`Filled Address 2: ${settings.address2}`)
            }

            const countryInputSel = '[data-dan-component="countryCode-field--select"]'
            const countryInputElem = await waitForSelector(countryInputSel, { timeoutMs: 60000 })
            if (!countryInputElem) {
                printDebug('Không tìm thấy input Country. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setSelect(countryInputSel, settings.country)
            printDebug(`Filled Country: ${settings.country}`)

            const cityInputSel = '[data-dan-component="city-field--input"]'
            const cityInputElem = await waitForSelector(cityInputSel, { timeoutMs: 60000 })
            if (!cityInputElem) {
                printDebug('Không tìm thấy input City. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setVal(cityInputSel, settings.city)
            printDebug(`Filled City: ${settings.city}`)

            const stateInputSel = '[data-dan-component="stateCode-field--select"]'
            const stateInputElem = await waitForSelector(stateInputSel, { timeoutMs: 60000 })
            if (!stateInputElem) {
                printDebug('Không tìm thấy input State. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setSelect(stateInputSel, settings.state)
            await delay(1000)
            printDebug(`Filled State: ${settings.state}`)

            const zipCodeInputSel = '[data-dan-component="postalCode-field--input"]'
            const zipCodeInputElem = await waitForSelector(zipCodeInputSel, { timeoutMs: 60000 })
            if (!zipCodeInputElem) {
                printDebug('Không tìm thấy input Zip Code. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setVal(zipCodeInputSel, settings.zipCode)
            printDebug(`Filled Zip Code: ${settings.zipCode}`)

            const phoneInputSel = '[data-dan-component="phone-field--input"]'
            const phoneInputElem = await waitForSelector(phoneInputSel, { timeoutMs: 60000 })
            if (!phoneInputElem) {
                printDebug('Không tìm thấy input Phone. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setVal(phoneInputSel, settings.phone)
            printDebug(`Filled Phone: ${settings.phone}`)

            const saveToAddressesInputSel = '[id="saveToAddresses"]'
            const saveToAddressesInputElem = await waitForSelector(saveToAddressesInputSel, { timeoutMs: 60000 })
            if (saveToAddressesInputElem) {
                setCheckbox(saveToAddressesInputSel, true)
                printDebug(`Checked Save to Addresses`)
            }
        }

        await deepClick(goToBillingBtnElem)
        printDebug(`Clicked Go To Billing button`)

        // Fill Promotion Code
        const reviewOrderEmailInputSel = '[data-dan-component="email-field--input"]'
        const reviewOrderEmailInputElem = await waitForSelector(reviewOrderEmailInputSel, { timeoutMs: 60000 })
        if (!reviewOrderEmailInputElem) {
            printDebug('Không tìm thấy input Email. Vui lòng mở trang sản phẩm và thử lại.')
            return { ok: false, ts: Date.now() }
        }

        const promotionCodeAccordionSel = '[data-dan-component="accordion--checkout-billing-accordion"] > div > button'
        const promotionCodeAccordionElem = selectElem(promotionCodeAccordionSel)
        if (promotionCodeAccordionElem) {
            await deepClick(promotionCodeAccordionElem)
            const removePromotionCodeSel = '[data-dan-component="Cart--Promo-Code--Remove"]'
            const removePromotionCodeElem = selectElem(removePromotionCodeSel)
            if (removePromotionCodeElem) {
                await click(removePromotionCodeElem)
                await delay(1000)
                printDebug("Clicked Remove promotion code")
            } else {
                printDebug("Not found Remove promotion code button")
            }
        } else {
            printDebug("Not found Promotion code accordion")
        }

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
        }

        if (hasAppliedPromotionCode) {
            chrome.runtime.sendMessage({
                type: 'PROMOTION_CODE_CONSUMED', data: {
                    code: appliedPromotionCode,
                    rest: restPromotionCodes,
                }
            })
        }

        printDebug("buy -> Leave")
        return { ok: true, ts: Date.now() } // <<-- trả về để không còn result:null

    } catch (error) {
        printDebug(`Error in buy: ${error}`)
        return { ok: false, ts: Date.now() }
    }
}
