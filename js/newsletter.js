// Kuchnia Metodyczna — newsletter (sign-up, confirmation, unsubscribe, pop-up) and contact form.
// Talks to the Google Apps Script web app set in js/config.js.
(function () {
  'use strict';

  var ENDPOINT = (window.KM_NEWSLETTER_ENDPOINT || '').trim();
  var CONTACT = 'kuchniametodyczna@gmail.com';
  var REG_VERSION = '2026-10-17';
  var POL_VERSION = '2026-10-17.2';
  var CONSENT_TERMS = 'Akceptuję Regulamin newslettera i oświadczam, że zapoznałam/em się z Polityką prywatności.';
  var CONSENT_NEWS = 'Wyrażam zgodę na otrzymywanie newslettera „Kuchnia Metodyczna” z informacjami o nowych odcinkach podcastu na podany adres e-mail.';
  var EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
  var GENERIC_ERROR = 'Coś poszło nie tak. Spróbuj ponownie za chwilę albo napisz do nas: ' + CONTACT + '.';

  function call(params) {
    // URL-encoded POST = "simple" CORS request, readable from Apps Script.
    var body = new URLSearchParams();
    Object.keys(params).forEach(function (k) { body.append(k, params[k]); });
    return fetch(ENDPOINT, { method: 'POST', body: body, redirect: 'follow' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
  }

  function say(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = 'nl-msg' + (kind ? ' is-' + kind : '');
  }

  function busy(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('is-busy', on);
  }

  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  function token() {
    var t = new URLSearchParams(location.search).get('t') || '';
    return /^[A-Za-z0-9_-]{16,80}$/.test(t) ? t : '';
  }

  // ---------- Sign-up forms (home section + footer) ----------
  function initSignup(form) {
    var msg = form.querySelector('.nl-msg');
    var btn = form.querySelector('.nl-submit');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.email.value.trim();
      form.email.setAttribute('aria-invalid', 'false');
      if (!EMAIL_RE.test(email) || email.length > 254) {
        form.email.setAttribute('aria-invalid', 'true');
        form.email.focus();
        return say(msg, 'Wpisz poprawny adres e-mail.', 'error');
      }
      if (!form.consent_terms.checked || !form.consent_newsletter.checked) {
        return say(msg, 'Aby się zapisać, zaznacz obie zgody.', 'error');
      }
      busy(btn, true);
      say(msg, 'Wysyłanie…');
      call({
        action: 'subscribe',
        email: email,
        name: form.first_name ? form.first_name.value.trim().slice(0, 60) : '',
        consent_terms: CONSENT_TERMS,
        consent_newsletter: CONSENT_NEWS,
        reg_version: REG_VERSION,
        pol_version: POL_VERSION,
        page: location.pathname + location.hash,
        ua: navigator.userAgent.slice(0, 200),
        website: form.website.value
      }).then(function (res) {
        if (res && res.ok) {
          if (res.status === 'already') {
            say(msg, 'Ten adres jest już zapisany do newslettera. Dziękujemy!', 'ok');
          } else {
            say(msg, 'Prawie gotowe! Wysłałyśmy wiadomość na adres ' + email +
              '. Kliknij link w środku, aby potwierdzić zapis (sprawdź też folder Spam lub Oferty).', 'ok');
          }
          form.reset();
          store('km_nl_done', '1');
          if (form.closest('[data-nl-popup]')) setTimeout(hidePopup, 7000);
        } else if (res && res.error === 'rate_limited') {
          say(msg, 'Link potwierdzający został już wysłany. Sprawdź skrzynkę lub spróbuj ponownie za kilka minut.', 'error');
        } else if (res && res.error === 'invalid_email') {
          say(msg, 'Wpisz poprawny adres e-mail.', 'error');
        } else {
          say(msg, GENERIC_ERROR, 'error');
        }
      }).catch(function () {
        say(msg, GENERIC_ERROR, 'error');
      }).then(function () { busy(btn, false); });
    });
  }

  // ---------- Confirmation page (potwierdz.html?t=...) ----------
  function initConfirm(box) {
    var msg = box.querySelector('.nl-msg');
    var btn = box.querySelector('[data-nl-confirm-btn]');
    var t = token();
    if (!t) {
      btn.hidden = true;
      return say(msg, 'Brak kodu potwierdzenia. Użyj linku z wiadomości e-mail, którą od nas otrzymałaś/eś.', 'error');
    }
    btn.addEventListener('click', function () {
      busy(btn, true);
      say(msg, 'Potwierdzanie…');
      call({ action: 'confirm', t: t }).then(function (res) {
        if (res && res.ok) {
          btn.hidden = true;
          store('km_nl_done', '1');
          say(msg, res.status === 'already'
            ? 'Ten zapis był już potwierdzony. Do usłyszenia w kolejnym odcinku!'
            : 'Dziękujemy! Zapis potwierdzony. Na Twoją skrzynkę wysłałyśmy wiadomość powitalną.', 'ok');
        } else if (res && res.error === 'expired') {
          say(msg, 'Ten link wygasł. Zapisz się ponownie na stronie głównej, a wyślemy nowy.', 'error');
        } else {
          say(msg, 'Ten link jest nieprawidłowy. Zapisz się ponownie na stronie głównej.', 'error');
        }
      }).catch(function () {
        say(msg, GENERIC_ERROR, 'error');
      }).then(function () { busy(btn, false); });
    });
  }

  // ---------- Unsubscribe page (wypisz.html[?t=...]) ----------
  function initUnsubscribe(tokenBox, requestForm) {
    var t = token();
    if (t) {
      tokenBox.hidden = false;
      var msg = tokenBox.querySelector('.nl-msg');
      var btn = tokenBox.querySelector('[data-nl-unsub-btn]');
      btn.addEventListener('click', function () {
        busy(btn, true);
        say(msg, 'Wypisywanie…');
        call({ action: 'unsubscribe', t: t }).then(function (res) {
          if (res && res.ok) {
            btn.hidden = true;
            say(msg, 'Wypisano. Nie będziemy już wysyłać Ci newslettera. Dziękujemy, że byłaś/eś z nami!', 'ok');
          } else {
            say(msg, 'Ten link jest nieprawidłowy. Wpisz adres e-mail poniżej albo napisz do nas: ' + CONTACT + '.', 'error');
            requestForm.hidden = false;
          }
        }).catch(function () {
          say(msg, GENERIC_ERROR, 'error');
        }).then(function () { busy(btn, false); });
      });
    } else {
      requestForm.hidden = false;
    }

    var rmsg = requestForm.querySelector('.nl-msg');
    var rbtn = requestForm.querySelector('.nl-submit');
    requestForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = requestForm.email.value.trim();
      if (!EMAIL_RE.test(email)) return say(rmsg, 'Wpisz poprawny adres e-mail.', 'error');
      busy(rbtn, true);
      say(rmsg, 'Wysyłanie…');
      call({ action: 'unsubscribe_request', email: email, website: requestForm.website.value })
        .then(function (res) {
          if (res && (res.ok || res.error === 'rate_limited')) {
            say(rmsg, 'Jeśli ten adres jest zapisany do newslettera, wysłałyśmy na niego link do wypisania. Sprawdź skrzynkę.', 'ok');
            requestForm.reset();
          } else {
            say(rmsg, GENERIC_ERROR, 'error');
          }
        }).catch(function () {
          say(rmsg, GENERIC_ERROR, 'error');
        }).then(function () { busy(rbtn, false); });
    });
  }


  // ---------- Gentle sign-up pop-up ----------
  var popup = null;
  var POP_DISMISS_DAYS = 30;

  function hidePopup() {
    if (!popup || popup.hidden) return;
    popup.classList.remove('is-open');
    setTimeout(function () { popup.hidden = true; }, 250);
  }

  function initPopup(el) {
    popup = el;
    if (store('km_nl_done')) return;
    var dismissed = Number(store('km_nl_dismissed') || 0);
    if (dismissed && Date.now() - dismissed < POP_DISMISS_DAYS * 864e5) return;

    var shown = false;
    var inline = document.getElementById('newsletter');
    function inlineVisible() {
      if (!inline || inline.hidden) return false;
      var r = inline.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    }
    function show() {
      if (shown || inlineVisible()) return;
      shown = true;
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
      popup.hidden = false;
      requestAnimationFrame(function () { popup.classList.add('is-open'); });
    }
    function onScroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > 0.5) show();
    }
    var timer = setTimeout(show, 25000);
    window.addEventListener('scroll', onScroll, { passive: true });

    function dismiss() { store('km_nl_dismissed', String(Date.now())); hidePopup(); }
    popup.querySelectorAll('[data-nl-pop-close]').forEach(function (b) { b.addEventListener('click', dismiss); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !popup.hidden) dismiss(); });
  }

  // ---------- Contact form (Szkolenia) ----------
  function initContact(form) {
    var msg = form.querySelector('.nl-msg');
    var btn = form.querySelector('button[type=submit]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.full_name.value.trim(), email = form.email.value.trim(), text = form.message.value.trim();
      ['full_name', 'email', 'message'].forEach(function (f) { form[f].setAttribute('aria-invalid', 'false'); });
      if (!name) { form.full_name.setAttribute('aria-invalid', 'true'); form.full_name.focus(); return say(msg, 'Podaj imię i nazwisko.', 'error'); }
      if (!EMAIL_RE.test(email)) { form.email.setAttribute('aria-invalid', 'true'); form.email.focus(); return say(msg, 'Wpisz poprawny adres e-mail.', 'error'); }
      if (text.length < 5) { form.message.setAttribute('aria-invalid', 'true'); form.message.focus(); return say(msg, 'Napisz kilka słów w wiadomości.', 'error'); }
      busy(btn, true);
      say(msg, 'Wysyłanie…');
      call({
        action: 'contact', name: name, email: email,
        org: form.org.value.trim(), phone: form.phone.value.trim(), message: text,
        page: location.pathname, website: form.website.value
      }).then(function (res) {
        if (res && res.ok) {
          say(msg, 'Dziękujemy! Wiadomość dotarła – odpowiemy na adres ' + email + ' najszybciej, jak to możliwe.', 'ok');
          form.reset();
        } else if (res && res.error === 'rate_limited') {
          say(msg, 'Wiadomość została już wysłana przed chwilą. Jeśli chcesz coś dodać, spróbuj za kilka minut.', 'error');
        } else {
          say(msg, GENERIC_ERROR, 'error');
        }
      }).catch(function () {
        say(msg, GENERIC_ERROR, 'error');
      }).then(function () { busy(btn, false); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var confirmBox = document.querySelector('[data-nl-confirm]');
    var unsubToken = document.querySelector('[data-nl-unsub-token]');
    var unsubReq = document.querySelector('[data-nl-unsub-request]');

    var contact = document.querySelector('form[data-contact]');
    var popEl = document.querySelector('[data-nl-popup]');
    var gift = (window.KM_NEWSLETTER_GIFT || '').trim();

    if (!ENDPOINT) {
      if (contact) contact.hidden = true;   // e-mail link in the intro stays as the fallback
      // Backend not connected yet: keep sign-up forms hidden, explain on action pages.
      var off = 'Newsletter jeszcze nie działa. Napisz do nas: ' + CONTACT + '.';
      if (confirmBox) { confirmBox.querySelector('[data-nl-confirm-btn]').hidden = true; say(confirmBox.querySelector('.nl-msg'), off, 'error'); }
      if (unsubToken && unsubReq) { unsubReq.hidden = false; unsubReq.querySelector('.nl-row').hidden = true; say(unsubReq.querySelector('.nl-msg'), off, 'error'); }
      return;
    }

    document.querySelectorAll('[data-nl-wrap]').forEach(function (w) { w.hidden = false; });
    if (gift) document.querySelectorAll('[data-nl-gift]').forEach(function (g) { g.textContent = '🎁 ' + gift; g.hidden = false; });
    document.querySelectorAll('form[data-nl]').forEach(initSignup);
    if (contact) initContact(contact);
    if (popEl) initPopup(popEl);
    if (confirmBox) initConfirm(confirmBox);
    if (unsubToken && unsubReq) initUnsubscribe(unsubToken, unsubReq);
  });
})();
