document.documentElement.classList.remove('no-js');

(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Anno nel footer
  doc.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Numero di sedi (si aggiorna da solo quando se ne aggiunge una)
  var tickets = Array.prototype.slice.call(doc.querySelectorAll('.ticket[data-lat]'));
  doc.querySelectorAll('[data-count-sedi]').forEach(function (el) { el.textContent = tickets.length; });

  // Titolo parola per parola
  doc.querySelectorAll('[data-split]').forEach(function (el) {
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = '';
    text.split(/\s+/).forEach(function (w, i) {
      var s = doc.createElement('span');
      s.className = 'w'; s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);
      s.textContent = w;
      el.appendChild(s);
      el.appendChild(doc.createTextNode(' '));
    });
  });
  function loaded() { requestAnimationFrame(function () { root.classList.add('is-loaded'); }); }
  if (doc.readyState === 'complete') loaded(); else window.addEventListener('load', loaded);
  setTimeout(loaded, 1800); // rete lenta: il titolo compare comunque

  // Rivelazioni allo scroll
  var reveals = doc.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  // Nav
  var nav = doc.querySelector('[data-nav]');
  var toggle = doc.querySelector('[data-menu-toggle]');
  var menu = doc.querySelector('[data-menu]');
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    menu.hidden = !open;
    doc.body.classList.toggle('menu-open', open);
  }
  if (toggle) toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  if (menu) menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Sezioni legate allo scroll
  var giro = doc.querySelector('.giro');
  var sedi = doc.querySelector('.sedi');
  var track = doc.querySelector('[data-track]');
  var pinMq = window.matchMedia('(min-width: 900px)');
  var pinned = false;

  function progress(sec) {
    var r = sec.getBoundingClientRect();
    var span = r.height - window.innerHeight;
    if (span <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / span));
  }

  function layoutSedi() {
    if (!sedi || !track) return;
    pinned = !reduce && pinMq.matches;
    root.classList.toggle('js-pin', pinned);
    if (pinned) {
      var shift = Math.max(0, track.scrollWidth - window.innerWidth);
      sedi.style.setProperty('--shift', shift + 'px');
      sedi.style.height = (window.innerHeight + shift * 0.9) + 'px';
    } else {
      sedi.style.removeProperty('--shift');
      sedi.style.height = '';
    }
  }

  var ticking = false;
  function update() {
    ticking = false;
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 40);
    if (reduce) return;
    if (giro) giro.style.setProperty('--p', progress(giro).toFixed(4));
    if (sedi && pinned) sedi.style.setProperty('--p', progress(sedi).toFixed(4));
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { layoutSedi(); onScroll(); });
  window.addEventListener('load', function () { layoutSedi(); onScroll(); });
  layoutSedi(); update();

  // Barra di avanzamento su telefono (scorrimento col dito)
  var viewport = doc.querySelector('.sedi__viewport');
  if (viewport && sedi) {
    viewport.addEventListener('scroll', function () {
      if (pinned) return;
      var max = viewport.scrollWidth - viewport.clientWidth;
      sedi.style.setProperty('--p', max > 0 ? (viewport.scrollLeft / max).toFixed(4) : 0);
    }, { passive: true });
  }

  // Porta in vista una sede (orizzontale su desktop, swipe su telefono)
  function showTicket(t) {
    if (!sedi || !t) return;
    if (pinned) {
      var shift = parseFloat(sedi.style.getPropertyValue('--shift')) || 0;
      var offset = t.offsetLeft - (window.innerWidth - t.offsetWidth) / 2;
      var p = shift > 0 ? Math.min(1, Math.max(0, offset / shift)) : 0;
      var top = sedi.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + p * (sedi.offsetHeight - window.innerHeight), behavior: reduce ? 'auto' : 'smooth' });
    } else {
      sedi.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (viewport) viewport.scrollTo({ left: t.offsetLeft - (viewport.clientWidth - t.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
    t.classList.remove('is-flash'); void t.offsetWidth; t.classList.add('is-flash');
  }

  // Trova la botte più vicina: la posizione è calcolata solo sul dispositivo
  var status = doc.querySelector('[data-geo-status]');
  function say(msg, ok) { if (status) { status.textContent = msg; status.classList.toggle('is-ok', !!ok); } }
  function km(a, b, c, d) {
    var R = 6371, toRad = Math.PI / 180;
    var dLat = (c - a) * toRad, dLng = (d - b) * toRad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * toRad) * Math.cos(c * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fmt(d) { return d < 1 ? Math.round(d * 1000 / 50) * 50 + ' m' : d.toFixed(d < 10 ? 1 : 0).replace('.', ',') + ' km'; }

  function locate() {
    setMenu(false);
    if (!('geolocation' in navigator) || !track) {
      say('Il tuo browser non condivide la posizione: scegli la sede dall’elenco.');
      if (sedi) sedi.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    say('Sto cercando la botte più vicina…');
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude, lng = pos.coords.longitude;
      var list = tickets.map(function (t) {
        return { t: t, d: km(lat, lng, parseFloat(t.getAttribute('data-lat')), parseFloat(t.getAttribute('data-lng'))) };
      }).sort(function (a, b) { return a.d - b.d; });
      var next = track.querySelector('.ticket--next');
      list.forEach(function (item, i) {
        track.insertBefore(item.t, next);
        var badge = item.t.querySelector('[data-dist]');
        if (badge) {
          badge.hidden = false;
          badge.textContent = (i === 0 ? 'La più vicina · ' : '') + 'circa ' + fmt(item.d);
          badge.classList.toggle('is-nearest', i === 0);
        }
      });
      var name = list[0].t.querySelector('.ticket__city').firstChild.textContent.trim();
      say('La botte più vicina è ' + name + ', a circa ' + fmt(list[0].d) + '. Ho messo le sedi in ordine di distanza.', true);
      layoutSedi(); update();
      showTicket(list[0].t);
    }, function () {
      say('Non ho potuto leggere la posizione: scegli la sede dall’elenco.');
      if (sedi) sedi.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }
  doc.querySelectorAll('[data-nearest]').forEach(function (b) { b.addEventListener('click', locate); });

  // Link ancora alle singole sedi (es. dal footer)
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="/#sede-"]');
    if (!a || location.pathname !== '/') return;
    var t = doc.getElementById(a.getAttribute('href').slice(2));
    if (t) { e.preventDefault(); showTicket(t); }
  });

  // Link segnaposto (dati ancora da ricevere)
  doc.querySelectorAll('[data-placeholder]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); });
  });
})();
