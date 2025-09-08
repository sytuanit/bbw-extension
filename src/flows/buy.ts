import { type BuySettings } from '../settings'

export async function buy(settings: BuySettings) {
    const api = window.__bbwDom
    if (!api) {
        alert('Dom Helper is not injected');
        return
    }

    const { delay, printDebug, showAlert, selectElem, waitForSelector, click, deepClick, setVal, setSelect, setCheckbox } = api
    printDebug("buy <- Enter", settings)

    try {
        const consumeCode = (codes: string): {
            code: string | null; // mã đầu tiên (null nếu hết)
            rest: string;        // phần còn lại (không dòng trống đầu/cuối)
            list: string[];      // mảng còn lại
        } => {
            const list = (codes || '')
                .split(/\r?\n/)
                .map(s => s.trim())
                .filter(Boolean);

            const code = list.shift() ?? null;     // lấy mã đầu tiên
            const next = list.join('\n');          // ghép phần còn lại, KHÔNG dư \n

            return { code, rest: next, list };
        }

        // Click Add To Bag
        const addToBagSel = '[data-dan-component="product-add-to-cart"]'
        const addToBagElem = await waitForSelector(addToBagSel, { timeoutMs: 1000 })
        if (addToBagElem) {
            await click(addToBagElem)
            printDebug(`Clicked Add to Bag`)
            if (settings.quantityPerBuy > 1) {
                const qtyIncreaseSel = '[data-dan-component="quantity-picker--increment-button"]'
                const qtyIncreaseElem = await waitForSelector(qtyIncreaseSel, { timeoutMs: 60000 })
                if (!qtyIncreaseElem) {
                    showAlert('Không tìm thấy nút tăng số lượng. Vui lòng mở trang sản phẩm và thử lại.')
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
                showAlert('Không tìm thấy nút Add to Bag cũng như input số lượng. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            const currentQty = parseInt(qtyInputElem.value || '1');
            printDebug(`Input số lượng hiện tại là ${currentQty}`)
            if (currentQty < settings.quantityPerBuy) {
                const qtyIncreaseSel = '[data-dan-component="quantity-picker--increment-button"]'
                const qtyIncreaseElem = await waitForSelector(qtyIncreaseSel, { timeoutMs: 60000 })
                if (!qtyIncreaseElem) {
                    showAlert('Không tìm thấy nút tăng số lượng. Vui lòng mở trang sản phẩm và thử lại.')
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
                    showAlert('Không tìm thấy nút giảm số lượng. Vui lòng mở trang sản phẩm và thử lại.')
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
            showAlert('Không tìm thấy nút Cart. Vui lòng mở trang sản phẩm và thử lại.')
            return { ok: false, ts: Date.now() }
        }

        await click(cartElem)
        printDebug(`Clicked Cart`)

        // Click Checkout
        const checkoutBtnSel = '[data-dan-component="cart-checkout-button"]'
        const checkoutBtnElem = await waitForSelector(checkoutBtnSel, { timeoutMs: 60000, mustBeEnabled: true })
        if (!checkoutBtnElem) {
            showAlert('Không tìm thấy nút Checkout. Vui lòng mở trang sản phẩm và thử lại.')
            return { ok: false, ts: Date.now() }
        }

        await click(checkoutBtnElem)
        printDebug(`Clicked Checkout button`)

        // Click Go To Billing
        const goToBillingBtnSel = '[data-dan-component="checkout-cta--button"] button'
        const goToBillingBtnElem = await waitForSelector(goToBillingBtnSel, { timeoutMs: 60000, mustBeEnabled: true })
        if (!goToBillingBtnElem) {
            showAlert('Không tìm thấy nút Go To Billing. Vui lòng mở trang sản phẩm và thử lại.')
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
                showAlert('Không tìm thấy input Last Name. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setVal(lastNameInputSel, settings.lastName)
            printDebug(`Filled Last Name: ${settings.lastName}`)

            const address1InputSel = '[data-dan-component="address1-field--input"]'
            const address1InputElem = await waitForSelector(address1InputSel, { timeoutMs: 60000 })
            if (!address1InputElem) {
                showAlert('Không tìm thấy input Address 1. Vui lòng mở trang sản phẩm và thử lại.')
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
                showAlert('Không tìm thấy input Country. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setSelect(countryInputSel, settings.country)
            printDebug(`Filled Country: ${settings.country}`)

            const cityInputSel = '[data-dan-component="city-field--input"]'
            const cityInputElem = await waitForSelector(cityInputSel, { timeoutMs: 60000 })
            if (!cityInputElem) {
                showAlert('Không tìm thấy input City. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setVal(cityInputSel, settings.city)
            printDebug(`Filled City: ${settings.city}`)

            const stateInputSel = '[data-dan-component="stateCode-field--select"]'
            const stateInputElem = await waitForSelector(stateInputSel, { timeoutMs: 60000 })
            if (!stateInputElem) {
                showAlert('Không tìm thấy input State. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setSelect(stateInputSel, settings.state)
            await delay(1000)
            printDebug(`Filled State: ${settings.state}`)

            const zipCodeInputSel = '[data-dan-component="postalCode-field--input"]'
            const zipCodeInputElem = await waitForSelector(zipCodeInputSel, { timeoutMs: 60000 })
            if (!zipCodeInputElem) {
                showAlert('Không tìm thấy input Zip Code. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setVal(zipCodeInputSel, settings.zipCode)
            printDebug(`Filled Zip Code: ${settings.zipCode}`)

            const phoneInputSel = '[data-dan-component="phone-field--input"]'
            const phoneInputElem = await waitForSelector(phoneInputSel, { timeoutMs: 60000 })
            if (!phoneInputElem) {
                showAlert('Không tìm thấy input Phone. Vui lòng mở trang sản phẩm và thử lại.')
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

        const reviewOrderEmailInputSel = '[data-dan-component="email-field--input"]'
        const reviewOrderEmailInputElem = await waitForSelector(reviewOrderEmailInputSel, { timeoutMs: 60000 })
        if (!reviewOrderEmailInputElem) {
            showAlert('Không tìm thấy input Email. Vui lòng mở trang sản phẩm và thử lại.')
            return { ok: false, ts: Date.now() }
        }

        // Fill Payment method
        const cardNumberInputSel = '[data-dan-component="number-field--input"]'
        const cardNumberInputElem = await waitForSelector(cardNumberInputSel, { timeoutMs: 1000 })
        if (cardNumberInputElem) {
            if (!cardNumberInputElem) {
                showAlert('Không tìm thấy input Card Number. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setVal(cardNumberInputSel, settings.cardNumber)
            printDebug(`Filled Card Number: ${settings.cardNumber}`)

            const cardHolderNameInputSel = '[data-dan-component="holder-field--input"]'
            const cardHolderNameInputElem = await waitForSelector(cardHolderNameInputSel, { timeoutMs: 60000 })
            if (!cardHolderNameInputElem) {
                showAlert('Không tìm thấy input Card Holder Name. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setVal(cardHolderNameInputSel, settings.cardHolderName)
            printDebug(`Filled Card Holder Name: ${settings.cardHolderName}`)

            const cardExpirationDateMonthInputSel = '[data-dan-component="expire-date--month"]'
            const cardExpirationDateMonthInputElem = await waitForSelector(cardExpirationDateMonthInputSel, { timeoutMs: 60000 })
            if (!cardExpirationDateMonthInputElem) {
                showAlert('Không tìm thấy input Card Expiration Date Month. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            const cardExpirationDateMonth = (settings.cardExpirationDateMonth - 1).toString()
            setSelect(cardExpirationDateMonthInputSel, cardExpirationDateMonth)
            printDebug(`Filled Card Expiration Date Month: ${cardExpirationDateMonth}`)

            const cardExpirationDateYearInputSel = '[data-dan-component="expire-date--year"]'
            const cardExpirationDateYearInputElem = await waitForSelector(cardExpirationDateYearInputSel, { timeoutMs: 60000 })
            if (!cardExpirationDateYearInputElem) {
                showAlert('Không tìm thấy input Card Expiration Date Year. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            const cardExpirationDateYear = settings.cardExpirationDateYear.toString()
            setSelect(cardExpirationDateYearInputSel, cardExpirationDateYear)
            printDebug(`Filled Card Expiration Date Year: ${cardExpirationDateYear}`)

            const cardSecurityCodeInputSel = '[data-dan-component="securityCode-field--input"]'
            const cardSecurityCodeInputElem = await waitForSelector(cardSecurityCodeInputSel, { timeoutMs: 60000 })
            if (!cardSecurityCodeInputElem) {
                showAlert('Không tìm thấy input Card Security Code. Vui lòng mở trang sản phẩm và thử lại.')
                return { ok: false, ts: Date.now() }
            }
            setVal(cardSecurityCodeInputSel, settings.cardSecurityCode)
            printDebug(`Filled Card Security Code: ${settings.cardSecurityCode}`)

            const setDefaultCheckoutSel = '[id="setDefaultCheckout"]'
            const setDefaultCheckoutElem = await waitForSelector(setDefaultCheckoutSel, { timeoutMs: 60000 })
            if (setDefaultCheckoutElem) {
                setCheckbox(setDefaultCheckoutSel, true)
                printDebug(`Checked Save and Make Default Card`)
            }
        } else {
            showAlert(`Not found Card Number input`)
            return { ok: false, ts: Date.now() }
        }

        // Fill Promotion Code
        var consumedPromotionCode = null;
        var restPromotionCodes = null;
        if (settings.promotionCodes) {
            const { code: code, rest: rest } = consumeCode(settings.promotionCodes)
            if (code) {
                printDebug(`Consuming Promotion Code: ${code}, rest: ${rest}`)
                const accordionSel = '[data-dan-component="accordion--checkout-billing-accordion"] > [data-dan-component="accordion-item-0"]> button'
                const accordionElem = selectElem(accordionSel)
                if (accordionElem) {
                    await deepClick(accordionElem)
                    await delay(100)
                    const removePromotionCodeSel = '[data-dan-component="Cart--Promo-Code--Remove"]'
                    const removePromotionCodeElem = selectElem(removePromotionCodeSel)
                    if (removePromotionCodeElem) {
                        await click(removePromotionCodeElem)
                        await delay(1000)
                        printDebug("Clicked Remove promotion code")
                    } else {
                        printDebug("Not found Remove promotion code button")
                    }

                    const promotionCodeSel = '[data-dan-component="promo-field--input"]'
                    const promotionCodeElem = await waitForSelector(promotionCodeSel, { timeoutMs: 60000 })
                    if (promotionCodeElem) {
                        setVal(promotionCodeSel, code)
                        printDebug(`Filled Promotion Code: ${code}`)
                        const applyBtnSel = '[data-dan-component="promo-field--btn"]'
                        const applyBtnElem = await waitForSelector(applyBtnSel, { timeoutMs: 60000, mustBeEnabled: true })
                        if (applyBtnElem) {
                            await click(applyBtnElem)
                            consumedPromotionCode = code
                            restPromotionCodes = rest
                            printDebug(`Clicked Apply Promotion Code button, consumedPromotionCode: ${consumedPromotionCode}, restPromotionCodes: ${restPromotionCodes}`)
                        }
                    }
                } else {
                    showAlert("Not found Promotion code accordion")
                    return { ok: false, ts: Date.now() }
                }
            } else {
                printDebug(`No Promotion Code to use`)
            }
        } else {
            showAlert(`No configured Promotion Code to use`)
            return { ok: false, ts: Date.now() }
        }

        // Fill Gift Card Code
        var consumedGiftCard = null;
        var restGiftCards = null;
        if (settings.giftCardCodes) {
            const { code: card, rest: rest } = consumeCode(settings.giftCardCodes)
            if (card) {
                printDebug(`Consuming Gift Card: ${card}, rest: ${rest}`)
                const accordionSel = '[data-dan-component="accordion--checkout-billing-accordion"] > [data-dan-component="accordion-item-2"]> button'
                const accordionElem = selectElem(accordionSel)
                if (accordionElem) {
                    await deepClick(accordionElem)
                    await delay(100)
                    const giftCard = settings.giftCardCodes.split(" ");
                    const giftCardNumber = giftCard[0];
                    const giftCardPin = giftCard[1];
                    consumedGiftCard = giftCard
                    restGiftCards = rest

                    const giftCardNumberInputSel = '[data-dan-component="giftCardNumber-field--input"]'
                    const giftCardNumberInputElem = await waitForSelector(giftCardNumberInputSel, { timeoutMs: 60000 })
                    if (giftCardNumberInputElem) {
                        setVal(giftCardNumberInputSel, giftCardNumber)
                        printDebug(`Filled Gift Card Number: ${giftCardNumber}`)
                    }

                    const giftCardPinInputSel = '[data-dan-component="giftCardPin-field--input"]'
                    const giftCardPinInputElem = await waitForSelector(giftCardPinInputSel, { timeoutMs: 60000 })
                    if (giftCardPinInputElem) {
                        setVal(giftCardPinInputSel, giftCardPin)
                        printDebug(`Filled Gift Card Pin: ${giftCardPin}`)
                    }

                    printDebug(`Applied Gift Card, consumedGiftCard: ${consumedGiftCard}, restGiftCards: ${restGiftCards}`)
                } else {
                    showAlert("Not found Promotion code accordion")
                    return { ok: false, ts: Date.now() }
                }

                const applyGiftCardBtnSel = '[data-dan-component="checkout--add-gift-card-btn"]'
                const applyGiftCardBtnElem = await waitForSelector(applyGiftCardBtnSel, { timeoutMs: 60000 })
                if (applyGiftCardBtnElem) {
                    await click(applyGiftCardBtnElem)
                    await delay(2000)
                    printDebug(`Clicked apply Gift Card button to display bot error`)
                } else {
                    showAlert("Not found Apply Gift Card button")
                    return { ok: false, ts: Date.now() }
                }
            } else {
                printDebug(`No Gift Card Code to use`)
            }
        } else {
            showAlert(`No configured Gift Card Code to use`)
            return { ok: false, ts: Date.now() }
        }

        const reviewOrderBtnSel = '[data-dan-component="checkout--review-order--btn"]'
        const reviewOrderBtnElem = await waitForSelector(reviewOrderBtnSel, { timeoutMs: 60000 })
        if (reviewOrderBtnElem) {
            await click(reviewOrderBtnElem)
            await delay(1000)
            printDebug(`Clicked Review Order button to display error`)
        } else {
            showAlert("Not found Review Order button")
            return { ok: false, ts: Date.now() }
        }

        while (true) {
            const applyGiftCardAlertSel = '[data-dan-component="check-gift-card-balance-alert--error"]'
            const applyGiftCardAlertElem = await waitForSelector(applyGiftCardAlertSel, { timeoutMs: 1000 })
            const isGiftCardValid = !applyGiftCardAlertElem;

            const cardNumberAlertSel = '[data-dan-component="number-field--error-message"]'
            const cardNumberAlertElem = await waitForSelector(cardNumberAlertSel, { timeoutMs: 1000 })
            const isCardValid = !cardNumberAlertElem;
            printDebug(`waiting isGiftCardValid: ${isGiftCardValid}, isCardValid: ${isCardValid}...`)
            if (isGiftCardValid && isCardValid) {
                break;
            }
            await delay(8000)
        }

        await click(reviewOrderBtnElem)
        await delay(1000)
        printDebug(`Clicked Review Order button after no more error`)

        chrome.runtime.sendMessage({
            type: 'BUY_SUCCESS', data: {
                consumedPromotionCode: consumedPromotionCode,
                restPromotionCodes: restPromotionCodes,
                consumedGiftCard: consumedGiftCard,
                restGiftCards: restGiftCards,
            }
        })

        printDebug("buy -> Leave")
        return { ok: true, ts: Date.now() } // <<-- trả về để không còn result:null

    } catch (error) {
        showAlert(`Error in buy: ${error}`)
        return { ok: false, ts: Date.now() }
    }
}
