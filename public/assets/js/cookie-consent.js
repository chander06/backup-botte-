/*!
 * Banner cookie conforme alle Linee guida del Garante Privacy (10/06/2021).
 * Nessuna dipendenza, nessun servizio esterno. Copiare in /assets/js/cookie-consent.js
 *
 * COME SI USA
 * 1. Includi nel <head>:  <script src="/assets/js/cookie-consent.js" defer></script>
 *    e il CSS:            <link rel="stylesheet" href="/assets/css/cookie-consent.css">
 * 2. Contenuti che richiedono consenso:
 *    - iframe:  <iframe data-consent="esterni" data-consent-src="https://www.google.com/maps/embed?..." title="Mappa" loading="lazy"></iframe>
 *               + subito prima un segnaposto: <div class="cc-placeholder" data-consent-placeholder="esterni">…<button data-consent-accept="esterni">Mostra la mappa</button></div>
 *    - script:  <script type="text/plain" data-consent="statistiche" data-consent-src="https://…"></script>
 * 3. Nel footer:  <button type="button" data-cookie-preferences>Preferenze cookie</button>
 * 4. Configura CATEGORIE qui sotto: lascia solo quelle usate davvero dal sito.
 *    Se non resta nessuna categoria oltre ai tecnici, il banner non compare (non è obbligatorio)
 *    e il pulsante "Preferenze cookie" viene nascosto.
 * 5. Se cambi gli strumenti usati, aumenta CONSENT_VERSION: il banner verrà richiesto di nuovo.
 */
(function () {
  'use strict';

  var CONSENT_VERSION = 1;
  var STORAGE_KEY = 'sbl_consent';
  var DURATA_GIORNI = 182; // 6 mesi: il Garante chiede di non riproporre il banner prima
  var COOKIE_POLICY_URL = '/cookie-policy';

  var CATEGORIE = [
    // { id: 'esterni', nome: 'Contenuti esterni', descrizione: 'Mappe interattive e contenuti di terze parti (es. Google Maps), che possono impostare cookie dei rispettivi fornitori.' }
    // { id: 'statistiche', nome: 'Statistiche', descrizione: 'Ci aiutano a capire come viene usato il sito, in forma aggregata.' }
  ];

  // ---------------------------------------------------------------------------
  var doc = document;
  var banner = null;

  function leggi() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || d.v !== CONSENT_VERSION) return null;
      if (Date.now() - d.t > DURATA_GIORNI * 864e5) return null;
      return d;
    } catch (e) { return null; }
  }

  function salva(scelte) {
    var d = { v: CONSENT_VERSION, t: Date.now(), scelte: scelte };
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) { /* storage bloccato: vale solo per questa visita */ }
    stato = d;
    applica(scelte);
    try { doc.dispatchEvent(new CustomEvent('sbl:consent', { detail: scelte })); } catch (e) {}
  }

  function tutte(valore) {
    var s = {};
    CATEGORIE.forEach(function (c) { s[c.id] = valore; });
    return s;
  }

  function applica(scelte) {
    CATEGORIE.forEach(function (c) {
      var ok = !!(scelte && scelte[c.id]);
      doc.querySelectorAll('[data-consent="' + c.id + '"]').forEach(function (el) {
        if (!ok) {
          // Consenso revocato: scarica il contenuto esterno già caricato (gli script restano fino al prossimo caricamento).
          if (el.tagName !== 'SCRIPT' && el.getAttribute('data-consent-loaded')) {
            el.removeAttribute('src');
            el.removeAttribute('data-consent-loaded');
          }
          return;
        }
        if (el.getAttribute('data-consent-loaded')) return;
        var src = el.getAttribute('data-consent-src');
        if (el.tagName === 'SCRIPT') {
          var s = doc.createElement('script');
          if (src) s.src = src; else s.text = el.text;
          el.parentNode.replaceChild(s, el);
        } else if (src) {
          el.setAttribute('src', src);
          el.setAttribute('data-consent-loaded', '1');
        }
      });
      doc.querySelectorAll('[data-consent-placeholder="' + c.id + '"]').forEach(function (el) {
        el.hidden = ok;
      });
    });
  }

  function chiudi() {
    if (banner) { banner.remove(); banner = null; }
    doc.documentElement.classList.remove('cc-open');
  }

  function bottone(testo, azione, extra) {
    var b = doc.createElement('button');
    b.type = 'button';
    b.className = extra === 'cc-close' ? 'cc-close' : 'cc-btn' + (extra ? ' ' + extra : '');
    b.textContent = testo;
    b.addEventListener('click', azione);
    return b;
  }

  function mostra(aperturaPannello) {
    chiudi();
    var attuali = (stato && stato.scelte) || tutte(false);

    banner = doc.createElement('div');
    banner.className = 'cc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'cc-title');

    var box = doc.createElement('div');
    box.className = 'cc-box';

    var x = bottone('×', function () { salva(tutte(false)); chiudi(); }, 'cc-close');
    x.setAttribute('aria-label', 'Chiudi e rifiuta i cookie non necessari');

    var h = doc.createElement('p');
    h.id = 'cc-title';
    h.className = 'cc-title';
    h.textContent = 'Rispettiamo la tua privacy';

    var p = doc.createElement('p');
    p.className = 'cc-text';
    p.appendChild(doc.createTextNode('Usiamo solo strumenti tecnici necessari al funzionamento del sito. Con il tuo consenso possiamo attivare anche contenuti di terze parti. Puoi cambiare idea in qualsiasi momento da "Preferenze cookie" in fondo alla pagina. '));
    var a = doc.createElement('a');
    a.href = COOKIE_POLICY_URL;
    a.textContent = 'Cookie policy';
    p.appendChild(a);

    // Pannello personalizza
    var pannello = doc.createElement('div');
    pannello.className = 'cc-panel';
    pannello.hidden = !aperturaPannello;

    var tecnici = doc.createElement('label');
    tecnici.className = 'cc-row';
    tecnici.innerHTML = '<span><strong>Tecnici</strong><small>Necessari al funzionamento del sito. Sempre attivi.</small></span>';
    var tIn = doc.createElement('input');
    tIn.type = 'checkbox'; tIn.checked = true; tIn.disabled = true;
    tecnici.appendChild(tIn);
    pannello.appendChild(tecnici);

    var inputs = {};
    CATEGORIE.forEach(function (c) {
      var row = doc.createElement('label');
      row.className = 'cc-row';
      var span = doc.createElement('span');
      var st = doc.createElement('strong'); st.textContent = c.nome;
      var sm = doc.createElement('small'); sm.textContent = c.descrizione;
      span.appendChild(st); span.appendChild(sm);
      var inp = doc.createElement('input');
      inp.type = 'checkbox';
      inp.checked = !!attuali[c.id]; // mai pre-selezionate alla prima visita
      inputs[c.id] = inp;
      row.appendChild(span); row.appendChild(inp);
      pannello.appendChild(row);
    });

    var azioni = doc.createElement('div');
    azioni.className = 'cc-actions';

    var btnRifiuta = bottone('Rifiuta', function () { salva(tutte(false)); chiudi(); });
    var btnAccetta = bottone('Accetta tutti', function () { salva(tutte(true)); chiudi(); });
    var btnPers = bottone('Personalizza', function () {
      if (pannello.hidden) {
        pannello.hidden = false;
        btnPers.textContent = 'Salva le scelte';
      } else {
        var s = {};
        CATEGORIE.forEach(function (c) { s[c.id] = inputs[c.id].checked; });
        salva(s); chiudi();
      }
    }, 'cc-btn--ghost');
    if (aperturaPannello) btnPers.textContent = 'Salva le scelte';

    // "Rifiuta" e "Accetta tutti" hanno volutamente lo stesso stile (stessa evidenza).
    azioni.appendChild(btnRifiuta);
    azioni.appendChild(btnPers);
    azioni.appendChild(btnAccetta);

    box.appendChild(x);
    box.appendChild(h);
    box.appendChild(p);
    box.appendChild(pannello);
    box.appendChild(azioni);
    banner.appendChild(box);
    doc.body.appendChild(banner);
    doc.documentElement.classList.add('cc-open');

    banner.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { salva(stato ? stato.scelte : tutte(false)); chiudi(); }
    });
    (aperturaPannello ? (inputs[CATEGORIE[0].id] || btnRifiuta) : btnRifiuta).focus({ preventScroll: true });
  }

  var stato = leggi();

  function init() {
    var preferenze = doc.querySelectorAll('[data-cookie-preferences]');

    if (!CATEGORIE.length) {
      // Solo strumenti tecnici: banner non obbligatorio.
      preferenze.forEach(function (b) { b.hidden = true; });
      return;
    }

    preferenze.forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); mostra(true); });
    });

    // Pulsanti nei segnaposto (es. "Mostra la mappa"): attivano solo quella categoria.
    doc.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-consent-accept]') : null;
      if (!t) return;
      e.preventDefault();
      var s = (stato && stato.scelte) ? JSON.parse(JSON.stringify(stato.scelte)) : tutte(false);
      s[t.getAttribute('data-consent-accept')] = true;
      salva(s);
      chiudi();
    });

    if (stato) applica(stato.scelte);
    else { applica(tutte(false)); mostra(false); }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
