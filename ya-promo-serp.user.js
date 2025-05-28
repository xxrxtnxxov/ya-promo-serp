// ==UserScript==
// @name         Yandex SERP: Promo
// @namespace    https://github.com/xxrxtnxxov
// @version      3.0
// @description  Явно помечает блоки рекламы в блоках «Поиск» и «Квартиры».
// @author       xxrxtnxxov
// @homepageURL  https://github.com/xxrxtnxxov/ya-promo-serp
// @updateURL    https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya-promo-serp.user.js
// @downloadURL  https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya-promo-serp.user.js
// @supportURL   https://github.com/xxrxtnxxov/ya-promo-serp/issues
// @icon         https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya.png
// @match        https://yandex.ru/search*
// @match        https://yandex.ru/realty*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .promo-title-label, .realty-ad-label {
      display: inline-block;
      margin-right: 6px;
      padding: 1px 4px;
      background-color: #DC143C;
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      line-height: 1;
      border-radius: 1px;
      vertical-align: middle;
      pointer-events: none;
    }
    li[data-fast] { position: relative; }
  `;
  document.head.appendChild(style);

  function markPromoInSearch(card) {
    const titleSpan = card.querySelector('span.OrganicTitleContentSpan');
    if (!titleSpan || titleSpan.querySelector('.promo-title-label')) return;

    const hasOffer = !!card.querySelector('.PromoOffer, [data-fast-name="PromoOffer"]');
    const hasCorner = Array.from(card.querySelectorAll('span'))
      .some(el => el.textContent.trim() === 'Промо');

    if (hasOffer || hasCorner) {
      const label = document.createElement('span');
      label.className = 'promo-title-label';
      label.textContent = 'ПРОМО';
      titleSpan.prepend(label);
    }
  }

  function processSearch() {
    document.querySelectorAll('li[data-fast]').forEach(markPromoInSearch);
    new MutationObserver(muts => {
      muts.forEach(({ addedNodes }) => {
        addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.matches('li[data-fast]')) {
            markPromoInSearch(node);
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  function markAdInRealty(el) {
    if (el.querySelector('.realty-ad-label')) return;
    if (!/^\s*Реклама\s*$/.test(el.textContent)) return;

    let target = el.closest('h3, .OfferSnippet-Header') || el;
    const label = document.createElement('span');
    label.className = 'realty-ad-label';
    label.textContent = 'РЕКЛАМА';
    target.prepend(label);
  }

  function processRealty() {
    Array.from(document.querySelectorAll('div, span'))
      .filter(el => /^\s*Реклама\s*$/.test(el.textContent))
      .forEach(markAdInRealty);

    new MutationObserver(muts => {
      muts.forEach(({ addedNodes }) => {
        addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            Array.from(node.querySelectorAll('div, span'))
              .filter(el => /^\s*Реклама\s*$/.test(el.textContent))
              .forEach(markAdInRealty);
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (/^\/search(?:\/|$)/.test(location.pathname)) {
    processSearch();
  }
  if (/^\/realty(?:\/|$)/.test(location.pathname)) {
    processRealty();
  }

})();
