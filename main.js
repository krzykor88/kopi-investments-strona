// Wspólny skrypt strony KOPI: pasek, pojawianie się sekcji, galeria z powiększeniem (jeśli jest na stronie).
(() => {
  const nav = document.querySelector('.nav');
  if (nav) addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), {passive: true});

  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), {threshold: .12});
    els.forEach(el => io.observe(el));
  } else {
    els.forEach(el => el.classList.add('in'));
  }

  formularzWyceny();

  const linki = [...document.querySelectorAll('.gallery a')];
  if (!linki.length) return;
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Powiększone zdjęcie');
  lb.innerHTML = '<img alt=""><p></p><button class="x" aria-label="Zamknij">&times;</button>' +
    '<button class="prev" aria-label="Poprzednie">&#8249;</button><button class="next" aria-label="Następne">&#8250;</button>';
  document.body.appendChild(lb);
  const img = lb.querySelector('img'), opis = lb.querySelector('p');
  let i = 0;
  const pokaz = n => {
    i = (n + linki.length) % linki.length;
    const a = linki[i], mini = a.querySelector('img');
    img.src = a.href; img.alt = mini.alt;
    opis.textContent = a.textContent.trim() + '  ·  ' + (i + 1) + ' / ' + linki.length;
  };
  const otworz = n => { pokaz(n); lb.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const zamknij = () => { lb.classList.remove('open'); document.body.style.overflow = ''; linki[i].focus(); };
  linki.forEach((a, n) => a.addEventListener('click', e => { e.preventDefault(); otworz(n); }));
  lb.querySelector('.x').onclick = zamknij;
  lb.querySelector('.prev').onclick = () => pokaz(i - 1);
  lb.querySelector('.next').onclick = () => pokaz(i + 1);
  lb.addEventListener('click', e => { if (e.target === lb) zamknij(); });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') zamknij();
    if (e.key === 'ArrowLeft') pokaz(i - 1);
    if (e.key === 'ArrowRight') pokaz(i + 1);
  });
  let x0 = null;
  lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, {passive: true});
  lb.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) pokaz(i + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();

// Formularz wstępnej wyceny (strona dla właścicieli) → Apps Script /exec, fn=zgloszenie, bez tokenu.
// Te same reguły co sprawdzZgloszenie_() w kod/strona_formularz/Kod.js — serwer sprawdza jeszcze raz.
function formularzWyceny() {
  const f = document.getElementById('formularz-wyceny');
  if (!f) return;
  f.t0.value = String(Date.now());
  const msg = f.querySelector('.form-msg');
  const btn = f.querySelector('button[type=submit]');
  const OPISY = {
    adres: 'podaj adres mieszkania', dzielnica: 'podaj dzielnicę', metraz: 'podaj metraż (w m²)',
    pokoje: 'podaj liczbę pokoi', email: 'sprawdź adres e-mail', telefon: 'sprawdź numer telefonu',
    kontakt: 'podaj e-mail lub telefon', zgoda: 'zaznacz zgodę na kontakt'
  };
  const pokaz = (tekst, klasa) => { msg.textContent = tekst; msg.className = 'form-msg ' + (klasa || ''); };
  const oznacz = pola => {
    f.querySelectorAll('.bad').forEach(el => el.classList.remove('bad'));
    pola.forEach(p => {
      if (p === 'kontakt') { f.email.classList.add('bad'); f.telefon.classList.add('bad'); }
      else if (p === 'zgoda') f.querySelector('.consent').classList.add('bad');
      else if (f[p]) f[p].classList.add('bad');
    });
  };
  const sprawdz = () => {
    const v = n => (f[n].value || '').trim();
    const bledy = [];
    if (v('adres').length < 3) bledy.push('adres');
    if (v('dzielnica').length < 2) bledy.push('dzielnica');
    const m = Number(v('metraz').replace(',', '.'));
    if (!(m >= 8 && m <= 1000)) bledy.push('metraz');
    const k = Number(v('pokoje'));
    if (!(k >= 1 && k <= 20 && Number.isInteger(k))) bledy.push('pokoje');
    const mail = v('email'), tel = v('telefon'), cyfry = tel.replace(/\D/g, '');
    if (mail && !/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(mail)) bledy.push('email');
    if (tel && !(cyfry.length >= 9 && cyfry.length <= 15 && /^[0-9 +()\-]+$/.test(tel))) bledy.push('telefon');
    if (!mail && !tel) bledy.push('kontakt');
    if (!f.zgoda.checked) bledy.push('zgoda');
    return bledy;
  };
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const bledy = sprawdz();
    oznacz(bledy);
    if (bledy.length) { pokaz('Uzupełnij: ' + bledy.map(b => OPISY[b]).join(', ') + '.', 'err'); return; }
    btn.disabled = true;
    pokaz('Wysyłam…');
    try {
      const odp = await fetch(f.dataset.endpoint, { method: 'POST', body: new URLSearchParams(new FormData(f)) });
      const wynik = await odp.json();
      if (wynik.ok) {
        f.classList.add('sent');
        pokaz('Dziękujemy! Zgłoszenie dotarło — odezwiemy się ze wstępną wyceną.', 'ok');
        return;
      }
      if (wynik.blad === 'DANE' && wynik.pola) {
        oznacz(wynik.pola);
        pokaz('Uzupełnij: ' + wynik.pola.map(b => OPISY[b] || b).join(', ') + '.', 'err');
      } else {
        pokaz('Nie udało się wysłać. Zadzwoń proszę: 516 567 845 albo napisz na kopi.investments@gmail.com.', 'err');
      }
    } catch (err) {
      pokaz('Nie udało się wysłać. Zadzwoń proszę: 516 567 845 albo napisz na kopi.investments@gmail.com.', 'err');
    }
    btn.disabled = false;
  });
}
