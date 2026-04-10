// ==UserScript==
// @name         Yandex SERP: Promo
// @namespace    https://github.com/xxrxtnxxov
// @version      6.8.2
// @description  Подсвечивает рекламные блоки в некоторых разделах поисковой системы Яндекс.
// @author       xxrxtnxxov
// @homepageURL  https://github.com/xxrxtnxxov/ya-promo-serp
// @updateURL    https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya-promo-serp.user.js
// @downloadURL  https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya-promo-serp.user.js
// @icon         https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya.png
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
            '.mg-adv-label',
            '.direct-label',
            '[data-baobab-name="adv"]',
            '.DistributionLinkBro'
        ].join(', ');
        
        document.querySelectorAll(attrSelectors).forEach(el => labels.push(el));

        const keywords = ['Реклама', 'Промо', 'Яндекс Директ', 'Спонсорский'];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        
        let node;
        while ((node = walker.nextNode())) {
            if (!node.nodeValue) continue;
            
            const cleanText = node.nodeValue.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            
            if (keywords.includes(cleanText)) {
                const parent = node.parentElement;
                if (parent && !['script', 'style', 'noscript'].includes(parent.tagName.toLowerCase())) {
                    labels.push(parent);
                }
            }
        }

        return [...new Set(labels)];
    }

    function findCardAncestor(element) {
        const semanticClasses = [
            '.serp-item', 
            '.serp-list__item',
            'li[data-fast]', 
            '.Organic', 
            'article', 
            '[role="listitem"]', 
            '[data-log-node]', 
            '.mg-card', 
            '.mg-snippet',
            '.news-feed__item', 
            '.NewsFeed-Item',
            '.OfferSnippet', 
            '.OffersSerpItem',
            '.bank-product-card',
            '.VideoItem',
            '.VideoSnippet',
            '.DistributionLinkBro' 
        ].join(', ');

        const semanticMatch = element.closest(semanticClasses);
        if (semanticMatch) return semanticMatch;

        let current = element.parentElement;
        let maxDepth = 10; 
        let depth = 0;

        while (current && current !== document.body && depth < maxDepth) {
            const tag = current.tagName.toLowerCase();
            
            if (['main', 'header', 'nav', 'section', 'aside', 'ul', 'ol', 'table'].includes(tag)) break;

            const className = current.getAttribute('class') || '';
            
            if (/(card|snippet|item|story|offer|product|grid__col|video)/i.test(className)) {
                if (!/(header|nav|menu|popup|modal|tooltip)/i.test(className)) {
                    return current;
                }
            }

            current = current.parentElement;
            depth++;
        }

        const linkMatch = element.closest('a');
        if (linkMatch && linkMatch.parentElement) {
            return linkMatch;
        }

        current = element.parentElement;
        for (let i = 0; i < 4; i++) {
            if (current && current.parentElement && !['main', 'header', 'nav', 'section', 'aside', 'ul', 'ol', 'table'].includes(current.parentElement.tagName.toLowerCase())) {
                current = current.parentElement;
            } else {
                break;
            }
        }

        return current || element.parentElement;
    }

    function applyVisibility() {
        const cards = document.querySelectorAll('[data-ya-promo-card="true"]');
        cards.forEach(card => {
            const el = card;
            el.style.display = state.isPromoVisible ? '' : 'none';
        });
    }

    const processDOM = rAFDebounce(() => {
        try {
            const labels = findAdLabels();
            labels.forEach(label => {
                if (label.dataset.yaPromoProcessed === "true") return;
                label.dataset.yaPromoProcessed = "true";

                if (!label.classList.contains('DistributionLinkBro')) {
                    label.style.setProperty('background-color', '#DC143C', 'important');
                    label.style.setProperty('color', '#fff', 'important');
                    label.style.setProperty('padding', '2px 6px', 'important');
                    label.style.setProperty('border-radius', '4px', 'important');
                    label.style.setProperty('font-weight', 'bold', 'important');
                    label.style.setProperty('font-size', '12px', 'important');
                    label.style.setProperty('line-height', '1', 'important');
                    label.style.setProperty('display', 'inline-block', 'important');
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
        if (document.getElementById('ya-promo-shield-host')) return;

        const host = document.createElement('div');
        host.id = 'ya-promo-shield-host';
        host.style.cssText = 'display: inline-flex; align-items: center; vertical-align: middle; margin: 0 10px; z-index: 100;';

        let injected = false;

        const navLinks = document.querySelectorAll('header a, nav a, [role="navigation"] a, .HeaderNav-Tab, .service-navigation__item, a[data-statlog*="tabs"]');
        const vseTab = Array.from(navLinks).find(el => el.textContent.trim() === 'Все');

        if (vseTab) {
            const parentLi = vseTab.closest('li');
            if (parentLi && parentLi.parentElement && parentLi.parentElement.tagName.toLowerCase() === 'ul') {
                const liHost = document.createElement('li');
                liHost.style.display = 'inline-flex';
                liHost.appendChild(host);
                parentLi.after(liHost);
            } else {
                vseTab.after(host);
            }
            injected = true;
        } else {
            const headerSelectors = [
                '.HeaderDesktopActions', 
                '.HeaderDesktop-Actions',
                'nav.HeaderNav', 
                '.HeaderDesktop-Navigation', 
                '.Header-Nav',
                '.serp-header__nav',
                '.news-header__nav',
                '.mg-header__actions',
                '.VanillaHeader-Actions'
            ].join(', ');

            const headerNav = document.querySelector(headerSelectors);
            if (headerNav) {
                headerNav.appendChild(host);
                injected = true;
            }
        }

        if (!injected) return;

        const shadow = host.attachShadow({ mode: 'closed' });

        const style = document.createElement('style');
        style.textContent = `
            .btn {
                display: inline-block;
                padding: 6px 12px;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 12px;
                font-weight: 700;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: opacity 0.2s, background-color 0.2s;
                user-select: none;
                white-space: nowrap;
            }
            .btn:hover { 
                opacity: 0.85; 
            }
            .btn.visible { 
                background-color: #DC143C; 
                color: #fff; 
            }
            .btn.hidden { 
                background-color: #777; 
                color: #fff; 
            }
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
        const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
        if (hasAddedNodes) {
            injectUI();
            processDOM();
        }
    });
    
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });

})();
