/* Licznik odwiedzin kopi-investments.pl — bez ciasteczek, bez zapisu w przeglądarce, bez identyfikatora.
 * Wysyła tylko: którą stronę otwarto, nazwę strony, z której przyszedł odwiedzający (sam host, np. google.com),
 * ewentualny znacznik kampanii z adresu (?utm_source= / ?z=) i rodzaj wejścia (zwykłe / odświeżenie / wstecz).
 * Odbiorca: projekt Apps Script „Strona — statystyki” (konto KOPI), który tylko dolicza 1 do licznika dnia.
 * Nie liczy: robotów, przeglądarek z „Do Not Track” / Global Privacy Control, podglądów poza domeną. */
(function () {
  'use strict';
  var ADRES = 'https://script.google.com/macros/s/AKfycbwQQ3hbwos5aNRbnW4hANAljACemyAorvKFdzaP07MzztmqE9Wrexju-ZGlhdornVt8/exec';
  try {
    var n = window.navigator || {};
    if (n.webdriver) return;
    if (/bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|bingpreview/i.test(n.userAgent || '')) return;
    if (n.doNotTrack === '1' || window.doNotTrack === '1' || n.globalPrivacyControl === true) return;
    var host = window.location.hostname;
    if (host !== 'kopi-investments.pl' && host !== 'www.kopi-investments.pl') return;
    if (document.visibilityState === 'prerender') return;
    if (typeof window.fetch !== 'function' || typeof window.URLSearchParams !== 'function') return;

    var typ = 'navigate';
    try {
      var nav = window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType('navigation')[0];
      if (nav && nav.type) typ = nav.type;
    } catch (e) { /* stara przeglądarka — zwykłe wejście */ }

    var odsylacz = '';
    try { odsylacz = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { odsylacz = ''; }

    var q = new URLSearchParams(window.location.search);
    var dane = new URLSearchParams({
      fn: 'odslona', v: '1', s: window.location.pathname, r: odsylacz,
      u: (q.get('utm_source') || q.get('z') || '').slice(0, 30), t: typ
    });
    // credentials: 'omit' — przeglądarka NIE dokleja ciasteczek Google; no-cors — odpowiedzi nie czytamy.
    window.fetch(ADRES, { method: 'POST', body: dane, mode: 'no-cors', credentials: 'omit', keepalive: true })
      .catch(function () { /* licznik nigdy nie psuje strony */ });
  } catch (e) { /* j.w. */ }
})();
