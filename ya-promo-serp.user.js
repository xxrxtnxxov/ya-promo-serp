// ==UserScript==
// @name         Yandex SERP: Promo
// @namespace    https://github.com/xxrxtnxxov
// @version      4.0
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

  let promoVisible = true;

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
    .promo-card { /* маркер для промо-позиций */ }
    .promo-toggle-btn {
      display: inline-block;
      margin-left: 12px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: bold;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      vertical-align: middle;
    }
    .promo-toggle-btn.hide {
      background-color: #DC143C;
      color: #fff;
    }
    .promo-toggle-btn.show {
      background-color: #aaa;
      color: #fff;
    }
  `;
  document.head.appendChild(style);

  function markPromoInSearch(card) {
    if (card.classList.contains('promo-card')) return;
    const titleSpan = card.querySelector('span.OrganicTitleContentSpan');
    if (!titleSpan) return;

    const hasOffer = !!card.querySelector('.PromoOffer, [data-fast-name="PromoOffer"]');
    const hasCorner = Array.from(card.querySelectorAll('span'))
      .some(el => el.textContent.trim() === 'Промо');

    if (hasOffer || hasCorner) {
      if (!titleSpan.querySelector('.promo-title-label')) {
        const label = document.createElement('span');
        label.className = 'promo-title-label';
        label.textContent = 'ПРОМО';
        titleSpan.prepend(label);
      }
      card.classList.add('promo-card');
      card.style.display = promoVisible ? '' : 'none';
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

    insertToggleButton();
    new MutationObserver(() => insertToggleButton())
      .observe(document.body, { childList: true, subtree: true });
  }

  function togglePromoEntries() {
    document.querySelectorAll('li.promo-card').forEach(card => {
      card.style.display = promoVisible ? 'none' : '';
    });
    promoVisible = !promoVisible;
    updateToggleButton();
  }

  function updateToggleButton() {
    const btn = document.querySelector('nav.HeaderNav.HeaderDesktop-Navigation .promo-toggle-btn');
    if (!btn) return;
    if (promoVisible) {
      btn.textContent = 'УБРАТЬ ПРОМО';
      btn.classList.add('hide');
      btn.classList.remove('show');
    } else {
      btn.textContent = 'ПОКАЗАТЬ ПРОМО';
      btn.classList.add('show');
      btn.classList.remove('hide');
    }
  }

  function insertToggleButton() {
    const nav = document.querySelector('nav.HeaderNav.HeaderDesktop-Navigation');
    if (!nav || nav.querySelector('.promo-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'promo-toggle-btn hide';
    btn.textContent = 'УБРАТЬ ПРОМО';
    btn.addEventListener('click', togglePromoEntries);
    nav.appendChild(btn);
  }

  function markAdInRealty(el) {
    if (el.querySelector('.realty-ad-label')) return;
    if (!/^\s*Реклама\s*$/.test(el.textContent)) return;
    const target = el.closest('h3, .OfferSnippet-Header') || el;
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
