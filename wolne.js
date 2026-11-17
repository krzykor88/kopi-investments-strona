/* Wolne pokoje na /wynajem/ (sekcja #lista).
 * Pobiera wyciąg z tego samego adresu, na który idzie formularz lokatora (GET ?fn=wolnePokoje).
 * Wyciąg liczy Centrum KOPI z systemu najmu, bez danych osobowych i bez cen.
 * Gdy coś zawiedzie (brak sieci, błąd, wyciąg nieaktualny albo pusty) — strona zostaje
 * przy tekście z HTML-a: „Teraz wszystkie nasze pokoje są wynajęte” + formularz listy oczekujących.
 * Tekst wstawiany wyłącznie przez textContent — nic z odpowiedzi nie trafia do HTML-a. */
(function () {
  'use strict';
  var MIESIACE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca',
                  'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

  function liczebnik(n, jeden, kilka, wiele) {
    if (n === 1) return jeden;
    var d = n % 10, s = n % 100;
    return (d >= 2 && d <= 4 && (s < 12 || s > 14)) ? kilka : wiele;
  }

  function dataPl(iso, rokDzis) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return '';
    var t = (+m[3]) + ' ' + MIESIACE[+m[2] - 1];
    return +m[1] === rokDzis ? t : t + ' ' + m[1];
  }

  /** Jedna linijka listy, np. „2 pokoje — ul. Krakowska (Gumieńce), wolne od zaraz”. */
  function linijka(p, rokDzis) {
    var n = p.liczba, co, wolne;
    if (p.typ === 'mieszkanie') {
      co = n === 1 ? 'Mieszkanie' : n + ' ' + liczebnik(n, 'mieszkanie', 'mieszkania', 'mieszkań');
      wolne = 'wolne';
    } else {
      co = n === 1 ? 'Pokój' : n + ' ' + liczebnik(n, 'pokój', 'pokoje', 'pokoi');
      wolne = n === 1 ? 'wolny' : 'wolne';
    }
    var kiedy = p.od ? 'od ' + dataPl(p.od, rokDzis) : 'od zaraz';
    return co + ' — ' + p.nazwa + ', ' + wolne + ' ' + kiedy;
  }

  function pokaz(sekcja, pozycje) {
    var h2 = sekcja.querySelector('[data-wolne="tytul"]');
    var opis = sekcja.querySelector('[data-wolne="opis"]');
    var lista = sekcja.querySelector('[data-wolne="lista"]');
    var przycisk = sekcja.querySelector('#formularz-lokatora button[type="submit"]');
    if (!h2 || !opis || !lista) return;
    var rok = new Date().getFullYear();
    var teraz = pozycje.some(function (p) { return !p.od; });
    h2.textContent = teraz ? 'Mamy wolne miejsca' : 'Wkrótce zwolnią się miejsca';
    opis.textContent = 'Zostaw kontakt albo zadzwoń — odezwiemy się, opowiemy o pokoju i umówimy oglądanie.';
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    pozycje.forEach(function (p) {
      var li = document.createElement('li');
      li.textContent = linijka(p, rok);
      lista.appendChild(li);
    });
    lista.hidden = false;
    if (przycisk) przycisk.textContent = 'Wyślij — odezwiemy się';
  }

  function poprawne(p) {
    return p && typeof p.nazwa === 'string' && (p.typ === 'pokoj' || p.typ === 'mieszkanie') &&
           typeof p.liczba === 'number' && p.liczba >= 1 && typeof p.od === 'string';
  }

  function start() {
    var sekcja = document.getElementById('lista');
    var form = document.getElementById('formularz-lokatora');
    if (!sekcja || !form || typeof window.fetch !== 'function') return;
    var adres = form.getAttribute('data-endpoint');
    if (!adres) return;
    var kontroler = typeof window.AbortController === 'function' ? new window.AbortController() : null;
    var zegar = kontroler ? setTimeout(function () { kontroler.abort(); }, 8000) : null;
    window.fetch(adres + '?fn=wolnePokoje', kontroler ? { signal: kontroler.signal } : {})
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (zegar) clearTimeout(zegar);
        if (!j || j.ok !== true || j.stan !== 'ok' || !Array.isArray(j.pozycje)) return;
        var pozycje = j.pozycje.filter(poprawne).slice(0, 20);
        if (pozycje.length) pokaz(sekcja, pozycje);
      })
      .catch(function () { /* zostaje tekst z HTML-a */ });
  }

  window.KOPI_WOLNE = { linijka: linijka, dataPl: dataPl, liczebnik: liczebnik, pokaz: pokaz, start: start };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
