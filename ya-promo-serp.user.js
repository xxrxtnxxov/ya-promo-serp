// ==UserScript==
// @name         Yandex SERP: Promo
// @namespace    https://github.com/xxrxtnxxov
// @version      6.14.0
// @description  Подсвечивает рекламные блоки в некоторых разделах поисковой системы Яндекс.
// @author       xxrxtnxxov
// @homepageURL  https://github.com/xxrxtnxxov/ya-promo-serp
// @updateURL    https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya-promo-serp.user.js
// @downloadURL  https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya-promo-serp.user.js
// @icon         https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya.png
// @match        https://ya.ru/search*
// @match        https://yandex.ru/search*
// @match        https://yandex.ru/realty*
// @match        https://yandex.ru/finance*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(async function () {

    'use strict';

    const state = {
        isPromoVisible: GM_getValue('promoVisible', true)
    };

    const rAFDebounce = (fn) => {
        let frame;
        return (...args) => {
            if (frame) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => fn(...args));
        };
    };

    const waitForBody = () => new Promise(resolve => {
        if (document.body) return resolve(document.body);
        const observer = new MutationObserver(() => {
            if (document.body) {
                observer.disconnect();
                resolve(document.body);
            }
        });
        observer.observe(document.documentElement, { childList: true });
    });

    function findAdLabels() {
        const labels = [];

        const attrSelectors = [
            '[aria-label="Реклама"]',
            '[aria-label="Промо"]',
            '[data-testid*="promo"]',
            '[data-testid*="ad-label"]',
            '.PromoOffer',
            '[data-fast-name="PromoOffer"]',
            '.AdvLabel-Text',
            '.AdvLabel',
            '.AdvCaption',
            '.mg-adv-label',
            '.direct-label',
            '[data-baobab-name="adv"]',
            '.DistributionLinkBro'
        ].join(', ');

        document.querySelectorAll(attrSelectors).forEach(el => labels.push(el));

        const keywords = ['реклама', 'промо', 'яндекс директ', 'спонсорский'];
        const ignoredTextContextSelectors = [
            '.Path',
            '.Organic-Path',
            '.OrganicTitleContentSpan',
            '.OrganicTextContentSpan',
            '.Sitelinks-Title',
            '.Snippet-Text',
            '.TextContainer',
            '.mini-suggest__popup',
            '.mini-suggest__item',
            '[class*="suggest"]',
            '[class*="Suggest"]',
            '[class*="MiniSuggest"]',
            '[role="listbox"]',
            '[role="option"]'
        ].join(', ');

        const isTextAdLabel = (text) => {
            if (keywords.includes(text)) return true;

            return /^(?:реклама|промо)(?:[\s:.,;()[\]{}\-–—]|$)/.test(text) && text.length < 25;
        };

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
            if (!node.nodeValue || node.nodeValue.length > 80) continue;

            const parent = node.parentElement;
            if (
                !parent ||
                ['script', 'style', 'noscript'].includes(parent.tagName.toLowerCase()) ||
                parent.closest(ignoredTextContextSelectors)
            ) {
                continue;
            }

            const cleanText = node.nodeValue.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/^[\s•·●○◆◇▪▫■□►▸▹*\-–—]+/, '').trim().toLowerCase();
            if (isTextAdLabel(cleanText)) {
                labels.push(parent);
            }
        }

        return [...new Set(labels)];
    }

    function findCardAncestor(element) {
        const directAdCard = element.closest(
            '.RealtyListing-AdvItem, .OfferSnippet_highlight, .SnippetCard'
        );
        if (directAdCard && directAdCard !== document.body) {
            return directAdCard;
        }

        let current = element.parentElement;
        let maxDepth = 15;
        let depth = 0;

        const microSelectors = [
            '.Scroller-Item', '.scroller__item', '.Carousel-Item', '.Slider-Item',
            '[data-baobab-name="product"]', '[data-baobab-name="item"]', '[data-baobab-name="snippet"]',
            '[data-baobab-name="offer"]', '[data-baobab-name="card"]',
            '.bank-product-card', '.mg-card', '.mg-snippet', '.news-feed__item', '.NewsFeed-Item',
            '[class*="OfferSnippet"]', '[class*="OffersSerpItem"]', '[class*="realty-snippet"]',
            '.DistributionLinkBro', '.TypoCard', '.UniSnippet', '.Snippet'
        ].join(', ');

        const macroSelectors = [
            '.serp-item', 'li[data-fast]', '.Organic', 'article', '[role="listitem"]'
        ].join(', ');

        while (current && current !== document.body && depth < maxDepth) {
            const tag = current.tagName.toLowerCase();

            if (['main', 'header', 'nav', 'section', 'aside', 'body'].includes(tag)) break;

            if (current.matches(microSelectors)) {
                return current;
            }

            const className = current.getAttribute('class') || '';

            if (tag === 'ul' || tag === 'ol' || tag === 'tbody' || /(scroller|carousel|slider|scroll-box|scroll__container|swiper-wrapper)/i.test(className)) {
                let child = element;
                while (child && child.parentElement !== current) {
                    child = child.parentElement;
                }
                if (child && child !== element && !['span', 'strong', 'b', 'i', 'em', 'svg'].includes(child.tagName.toLowerCase())) {
                    return child;
                }
            }

            if (/(card|snippet|item|offer|product|grid__col)/i.test(className)) {
                if (!/(serp-list|wrap|container|scroller|carousel|slider|row|header|nav|menu|popup|modal|tooltip|layout)/i.test(className)) {
                    return current;
                }
            }

            if (current.matches(macroSelectors)) {
                return current;
            }

            current = current.parentElement;
            depth++;
        }

        const linkMatch = element.closest('a');
        if (linkMatch && linkMatch.parentElement) {
            const text = linkMatch.textContent.replace(/[\s\u200B-\u200D\uFEFF]+/g, '').toLowerCase();
            if (!/^(реклама|промо|яндексдирект|спонсорский)/.test(text)) {
                return linkMatch;
            }
        }

        return element.parentElement;
    }

    function applyVisibility() {
        const cards = document.querySelectorAll('[data-ya-promo-card="true"]');
        cards.forEach(card => {
            card.style.display = state.isPromoVisible ? '' : 'none';
        });
    }

    const processDOM = rAFDebounce(() => {
        try {
            const labels = findAdLabels();
            labels.forEach(label => {
                if (label.dataset.yaPromoProcessed === "true") return;
                label.dataset.yaPromoProcessed = "true";

                if (label.classList.contains('DistributionLinkBro')) return;

                const textChild = Array.from(label.children).find(c =>
                    c.classList.contains('AdvLabel-Text') || c.classList.contains('AdvCaption-Text')
                );
                const target = textChild || label;

                const tMatch = target.textContent.match(/^[\s•·●○◆◇▪▫■□►▸▹*\-–—]+(.+)$/);
                if (tMatch && /^(реклама|промо)/i.test(tMatch[1].trim())) {
                    target.textContent = tMatch[1].trim();
                }

                const isPromoSnippet = label.classList.contains('InfoSection') ||
                    Array.from(label.classList).some(cls => cls.startsWith('PromoOffer_'));
                if (isPromoSnippet) {
                    target.style.setProperty('outline', '2px dashed #DC143C', 'important');
                    target.style.setProperty('outline-offset', '-2px', 'important');
                } else {
                    target.style.setProperty('background-color', '#DC143C', 'important');
                    target.style.setProperty('color', '#fff', 'important');
                    target.style.setProperty('padding', '2px 6px', 'important');
                    target.style.setProperty('border-radius', '4px', 'important');
                    target.style.setProperty('font-weight', 'bold', 'important');
                    target.style.setProperty('font-size', '12px', 'important');
                    target.style.setProperty('line-height', '1', 'important');
                    target.style.setProperty('display', 'inline-block', 'important');
                }

                const card = findCardAncestor(label);
                if (card && card !== document.body) {
                    card.dataset.yaPromoCard = "true";
                    card.style.display = state.isPromoVisible ? '' : 'none';
                }
            });
        } catch (error) {
            console.error('[Ya Promo Shield]', error);
        }
    });

    function injectUI() {
        const navLinks = document.querySelectorAll('header a, nav a, [role="navigation"] a, .HeaderNav-Tab, .service-navigation__item, a[data-statlog*="tabs"]');
        const vseTab = Array.from(navLinks).find(el => el.textContent.trim() === 'Все');

        if (!vseTab) return;

        const existingHost = document.getElementById('ya-promo-shield-host');
        const existingWrapper = document.getElementById('ya-promo-shield-host-wrapper');
        if (existingHost && existingWrapper && existingWrapper.previousElementSibling === vseTab.closest('li')) return;
        if (existingHost && !existingWrapper && existingHost.previousElementSibling === vseTab) return;

        const host = existingHost || document.createElement('div');
        host.id = 'ya-promo-shield-host';
        host.style.cssText = 'display: flex; align-items: center; margin-left: 8px; position: relative; z-index: 100;';

        const parentLi = vseTab.closest('li');
        if (parentLi && parentLi.parentElement && parentLi.parentElement.tagName.toLowerCase() === 'ul') {
            let liHost = existingWrapper;
            if (!liHost || liHost.tagName.toLowerCase() !== 'li') {
                liHost = document.createElement('li');
                liHost.id = 'ya-promo-shield-host-wrapper';
                liHost.style.cssText = 'display: inline-block; vertical-align: middle; line-height: 1;';
            }
            liHost.appendChild(host);
            parentLi.after(liHost);
        } else {
            if (existingWrapper) existingWrapper.remove();
            vseTab.after(host);
        }

        if (host.shadowRoot || host.dataset.yaPromoUi === "true") return;
        host.dataset.yaPromoUi = "true";

        const shadow = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                height: 28px;
                padding: 0 12px;
                margin: 0;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 12px;
                font-weight: 700;
                line-height: 1;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: opacity 0.2s, background-color 0.2s;
                user-select: none;
                white-space: nowrap;
            }
            .btn:hover { opacity: 0.85; }
            .btn.visible { background-color: #DC143C; color: #fff; }
            .btn.hidden  { background-color: #777;    color: #fff; }
        `;

        const btn = document.createElement('button');
        btn.className = `btn ${state.isPromoVisible ? 'visible' : 'hidden'}`;
        btn.textContent = state.isPromoVisible ? 'УБРАТЬ ПРОМО' : 'ПОКАЗАТЬ ПРОМО';

        const toggleHandler = () => {
            state.isPromoVisible = !state.isPromoVisible;
            GM_setValue('promoVisible', state.isPromoVisible);
            btn.textContent = state.isPromoVisible ? 'УБРАТЬ ПРОМО' : 'ПОКАЗАТЬ ПРОМО';
            btn.className = `btn ${state.isPromoVisible ? 'visible' : 'hidden'}`;
            applyVisibility();
            if (state.isPromoVisible) processDOM();
        };

        btn.addEventListener('click', toggleHandler);
        shadow.append(style, btn);
    }

    await waitForBody();
    injectUI();
    processDOM();

    const observer = new MutationObserver((mutations) => {
        const hasAddedNodes = mutations.some(m => {
            return Array.from(m.addedNodes).some(node => {
                return !(
                    node.nodeType === Node.ELEMENT_NODE &&
                    (
                        node.id === 'ya-promo-shield-host' ||
                        node.id === 'ya-promo-shield-host-wrapper' ||
                        node.closest?.('#ya-promo-shield-host, #ya-promo-shield-host-wrapper')
                    )
                );
            });
        });
        if (hasAddedNodes) {
            injectUI();
            processDOM();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
