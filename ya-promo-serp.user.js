// ==UserScript==
// @name         Yandex SERP: Promo
// @namespace    https://github.com/xxrxtnxxov
// @version      2.0
// @description  Добавляет в начало заголовка промо-ссылок стилизованный бейдж «ПРОМО» (белый текст на красном фоне).
// @author       xxrxtnxxov
// @homepageURL  https://github.com/xxrxtnxxov/ya-promo-serp
// @updateURL    https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya-promo-serp.user.js
// @downloadURL  https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya-promo-serp.user.js
// @supportURL   https://github.com/xxrxtnxxov/ya-promo-serp/issues
// @icon         https://raw.githubusercontent.com/xxrxtnxxov/ya-promo-serp/main/ya.png
// @match        https://yandex.ru/search/*
// @match        https://yandex.ru/search*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .promo-title-label {
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
    }
  `;
  document.head.appendChild(style);

  function markPromoInCard(card) {
    const titleSpan = card.querySelector('span.OrganicTitleContentSpan');
    if (!titleSpan) return;

    if (titleSpan.querySelector('.promo-title-label')) return;

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

  function processAllCards() {
    document.querySelectorAll('li[data-fast]').forEach(markPromoInCard);
  }

  const observer = new MutationObserver(muts => {
    muts.forEach(({ addedNodes }) => {
      addedNodes.forEach(node => {
        if (node.nodeType === 1 && node.matches('li[data-fast]')) {
          markPromoInCard(node);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  processAllCards();
})();
