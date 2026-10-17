/**
 * Kuchnia Metodyczna — newsletter backend (Google Apps Script).
 *
 * Runs inside a Google Sheet owned by kuchniametodyczna@gmail.com and is
 * deployed as a web app. The website (js/newsletter.js) sends it:
 *   action=subscribe            → new row "oczekuje" + confirmation e-mail (double opt-in)
 *   action=confirm&t=…          → status "aktywny" + notification e-mail
 *   action=unsubscribe&t=…      → status "wypisany" + notification e-mail
 *                                 (also used by Gmail's one-click "Unsubscribe" button)
 *   action=unsubscribe_request  → e-mails a personal unsubscribe link
 * The "Newsletter" menu in the Sheet sends the monthly newsletter, one e-mail
 * per subscriber, each with a personal unsubscribe link.
 *
 * Setup: see INSTRUKCJA.md. Run "skonfiguruj" once before deploying.
 */

const CONFIG = {
  SITE_URL: 'https://kuchniametodyczna.pl',
  NOTIFY_EMAIL: 'kuchniametodyczna@gmail.com',   // where sign-up / unsubscribe notices go
  REPLY_TO: 'kuchniametodyczna@gmail.com',
  SENDER_NAME: 'Kuchnia Metodyczna',
  CONFIRM_DAYS: 7,              // confirmation link validity
  PENDING_CLEANUP_DAYS: 30,     // unconfirmed sign-ups older than this can be removed from the menu
  DAILY_NEWSLETTER_LIMIT: 90,   // newsletter e-mails per day (free Gmail account: keep below ~100)
  DAILY_SERVICE_MAIL_LIMIT: 60, // confirmation links, unsubscribe links and notices per day
  WEB_APP_URL: ''               // optional: paste the /exec URL if one-click unsubscribe links are missing
};

const SHEET_SUBS = 'Subskrybenci';
const SHEET_MSG = 'Wiadomość';
const SHEET_LOG = 'Dziennik';
const TZ = 'Europe/Warsaw';

const STATUS = { PENDING: 'oczekuje', ACTIVE: 'aktywny', OUT: 'wypisany' };

const HEADERS = [
  'E-mail', 'Status', 'Data zapisu', 'Data potwierdzenia', 'Data wypisu',
  'Zgoda: regulamin i polityka (treść)', 'Zgoda: newsletter (treść)',
  'Wersja regulaminu', 'Wersja polityki', 'Strona zapisu', 'Przeglądarka',
  'Token wypisu', 'Token potwierdzenia', 'Ostatnia wysyłka (ID)', 'Uwagi'
];
const COL = {
  EMAIL: 1, STATUS: 2, SIGNED: 3, CONFIRMED: 4, UNSUBSCRIBED: 5,
  CONSENT_TERMS: 6, CONSENT_NEWS: 7, REG_VER: 8, POL_VER: 9, PAGE: 10, UA: 11,
  UNSUB_TOKEN: 12, CONFIRM_TOKEN: 13, LAST_SENT: 14, NOTES: 15
};

const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,80}$/;

// =============================================================================
// Web app entry points
// =============================================================================

function doGet() {
  return json_({ ok: true, service: 'kuchnia-metodyczna-newsletter' });
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  try {
    switch (p.action) {
      case 'subscribe': return json_(subscribe_(p));
      case 'confirm': return json_(confirm_(p));
      case 'unsubscribe': return json_(unsubscribe_(p));
      case 'unsubscribe_request': return json_(unsubscribeRequest_(p));
      default: return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    console.error(err && err.stack || err);
    log_('BŁĄD', '', String(err && err.message || err));
    return json_({ ok: false, error: 'server' });
  }
}

// =============================================================================
// Actions
// =============================================================================

function subscribe_(p) {
  if (p.website) return { ok: true, status: 'pending' };          // spam trap: pretend success
  const email = normEmail_(p.email);
  if (!email) return { ok: false, error: 'invalid_email' };
  if (!p.consent_terms || !p.consent_newsletter) return { ok: false, error: 'consent_required' };

  const cache = CacheService.getScriptCache();
  const cacheKey = 'sub:' + email;
  if (cache.get(cacheKey)) return { ok: false, error: 'rate_limited' };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let confirmToken;
  try {
    const sheet = subsSheet_();
    const row = findRow_(sheet, COL.EMAIL, email);
    const now = new Date();

    if (row && sheet.getRange(row, COL.STATUS).getValue() === STATUS.ACTIVE) {
      return { ok: true, status: 'already' };
    }
    if (!takeBudget_('service', CONFIG.DAILY_SERVICE_MAIL_LIMIT)) {
      log_('LIMIT', email, 'Dzienny limit wiadomości potwierdzających wyczerpany');
      return { ok: false, error: 'busy' };
    }

    confirmToken = newToken_();
    const values = [
      email, STATUS.PENDING, now, '', '',
      clip_(p.consent_terms, 500), clip_(p.consent_newsletter, 500),
      clip_(p.reg_version, 20), clip_(p.pol_version, 20),
      clip_(p.page, 200), clip_(p.ua, 200),
      '', confirmToken, '', ''
    ].map(safe_);

    if (row) {
      const old = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
      values[COL.UNSUB_TOKEN - 1] = old[COL.UNSUB_TOKEN - 1] || newToken_();
      values[COL.LAST_SENT - 1] = old[COL.LAST_SENT - 1];
      let notes = String(old[COL.NOTES - 1] || '');
      if (old[COL.STATUS - 1] === STATUS.OUT) {
        notes = (notes ? notes + ' | ' : '') + 'Ponowny zapis ' + fmt_(now) +
          ' (poprzedni wypis: ' + fmt_(old[COL.UNSUBSCRIBED - 1]) + ')';
      }
      values[COL.NOTES - 1] = notes;
      sheet.getRange(row, 1, 1, HEADERS.length).setValues([values]);
    } else {
      values[COL.UNSUB_TOKEN - 1] = newToken_();
      sheet.appendRow(values);
    }
  } finally {
    lock.releaseLock();
  }

  sendConfirmation_(email, confirmToken);
  cache.put(cacheKey, '1', 600);                  // one confirmation e-mail per address per 10 min
  log_('ZAPIS (oczekuje)', email, clip_(p.page, 200));
  return { ok: true, status: 'pending' };
}

function confirm_(p) {
  const t = String(p.t || '');
  if (!TOKEN_RE.test(t)) return { ok: false, error: 'invalid' };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let email;
  try {
    const sheet = subsSheet_();
    const row = findRow_(sheet, COL.CONFIRM_TOKEN, t);
    if (!row) return { ok: false, error: 'invalid' };
    const r = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
    email = r[COL.EMAIL - 1];
    if (r[COL.STATUS - 1] === STATUS.ACTIVE) return { ok: true, status: 'already' };
    if (r[COL.STATUS - 1] === STATUS.OUT) return { ok: false, error: 'invalid' };
    const signed = r[COL.SIGNED - 1];
    if (signed instanceof Date && Date.now() - signed.getTime() > CONFIG.CONFIRM_DAYS * 864e5) {
      return { ok: false, error: 'expired' };
    }
    sheet.getRange(row, COL.STATUS).setValue(STATUS.ACTIVE);
    sheet.getRange(row, COL.CONFIRMED).setValue(new Date());
  } finally {
    lock.releaseLock();
  }
  log_('POTWIERDZENIE', email, '');
  notify_('Nowy subskrybent: ' + email,
    'Nowa osoba potwierdziła zapis do newslettera:\n\n' + email + '\n\n' +
    'Podsumowanie: ' + summaryText_() + '\n\nArkusz: ' + SpreadsheetApp.getActive().getUrl());
  return { ok: true, status: 'confirmed' };
}

function unsubscribe_(p) {
  const t = String(p.t || '');
  if (!TOKEN_RE.test(t)) return { ok: false, error: 'invalid' };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let email;
  try {
    const sheet = subsSheet_();
    const row = findRow_(sheet, COL.UNSUB_TOKEN, t);
    if (!row) return { ok: false, error: 'invalid' };
    email = sheet.getRange(row, COL.EMAIL).getValue();
    if (sheet.getRange(row, COL.STATUS).getValue() === STATUS.OUT) return { ok: true, status: 'already' };
    sheet.getRange(row, COL.STATUS).setValue(STATUS.OUT);
    sheet.getRange(row, COL.UNSUBSCRIBED).setValue(new Date());
  } finally {
    lock.releaseLock();
  }
  log_('WYPIS', email, p['List-Unsubscribe'] ? 'przycisk Gmaila (one-click)' : 'link / strona wypisz.html');
  notify_('Wypisano: ' + email,
    'Osoba wypisała się z newslettera:\n\n' + email + '\n\nPodsumowanie: ' + summaryText_());
  return { ok: true, status: 'unsubscribed' };
}

function unsubscribeRequest_(p) {
  if (p.website) return { ok: true };
  const email = normEmail_(p.email);
  if (!email) return { ok: false, error: 'invalid_email' };
  const cache = CacheService.getScriptCache();
  const cacheKey = 'unsub:' + email;
  if (cache.get(cacheKey)) return { ok: false, error: 'rate_limited' };
  cache.put(cacheKey, '1', 600);

  const sheet = subsSheet_();
  const row = findRow_(sheet, COL.EMAIL, email);
  // Same answer whether or not the address is on the list (no address probing).
  if (row && sheet.getRange(row, COL.STATUS).getValue() !== STATUS.OUT &&
      takeBudget_('service', CONFIG.DAILY_SERVICE_MAIL_LIMIT)) {
    const token = sheet.getRange(row, COL.UNSUB_TOKEN).getValue();
    sendUnsubscribeLink_(email, token);
    log_('PROŚBA O WYPIS', email, 'wysłano link');
  }
  return { ok: true };
}

// =============================================================================
// E-mails (confirmation, unsubscribe link, notices)
// =============================================================================

function sendConfirmation_(email, token) {
  const url = CONFIG.SITE_URL + '/potwierdz.html?t=' + token;
  const html = layout_(
    '<p>Dzień dobry!</p>' +
    '<p>Dziękujemy za zapis do newslettera „Kuchnia Metodyczna”. Aby go potwierdzić, kliknij przycisk poniżej ' +
    '(link jest ważny przez ' + CONFIG.CONFIRM_DAYS + ' dni):</p>' +
    button_(url, 'Potwierdzam zapis') +
    '<p style="color:#6b645b;font-size:14px">Jeśli to nie Ty podałaś/eś ten adres, po prostu zignoruj tę wiadomość &mdash; ' +
    'bez potwierdzenia nie wyślemy Ci newslettera.</p>' +
    '<p>Magdalena i Justyna<br>Kuchnia Metodyczna</p>', '');
  const text = 'Dzień dobry!\n\nDziękujemy za zapis do newslettera „Kuchnia Metodyczna”. ' +
    'Aby go potwierdzić, otwórz link (ważny przez ' + CONFIG.CONFIRM_DAYS + ' dni):\n' + url +
    '\n\nJeśli to nie Ty podałaś/eś ten adres, zignoruj tę wiadomość.\n\nMagdalena i Justyna\nKuchnia Metodyczna';
  MailApp.sendEmail({
    to: email, subject: 'Potwierdź zapis do newslettera Kuchni Metodycznej',
    body: text, htmlBody: html, name: CONFIG.SENDER_NAME, replyTo: CONFIG.REPLY_TO
  });
}

function sendUnsubscribeLink_(email, token) {
  const url = CONFIG.SITE_URL + '/wypisz.html?t=' + token;
  const html = layout_(
    '<p>Dzień dobry!</p>' +
    '<p>Otrzymałyśmy prośbę o wypisanie tego adresu z newslettera „Kuchnia Metodyczna”. ' +
    'Aby to potwierdzić, kliknij przycisk:</p>' + button_(url, 'Wypisz mnie') +
    '<p style="color:#6b645b;font-size:14px">Jeśli to nie Ty, zignoruj tę wiadomość &mdash; nic się nie zmieni.</p>', '');
  const text = 'Dzień dobry!\n\nOtrzymałyśmy prośbę o wypisanie tego adresu z newslettera „Kuchnia Metodyczna”. ' +
    'Aby to potwierdzić, otwórz link:\n' + url + '\n\nJeśli to nie Ty, zignoruj tę wiadomość.';
  MailApp.sendEmail({
    to: email, subject: 'Wypisanie z newslettera Kuchni Metodycznej',
    body: text, htmlBody: html, name: CONFIG.SENDER_NAME, replyTo: CONFIG.REPLY_TO
  });
}

function notify_(subject, text) {
  if (!CONFIG.NOTIFY_EMAIL || !takeBudget_('service', CONFIG.DAILY_SERVICE_MAIL_LIMIT)) return;
  try {
    MailApp.sendEmail(CONFIG.NOTIFY_EMAIL, '[Newsletter] ' + subject, text, { name: CONFIG.SENDER_NAME });
  } catch (err) {
    console.warn('notify failed', err);
  }
}

// =============================================================================
// Sheet menu: sending the newsletter
// =============================================================================

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Newsletter')
    .addItem('Wyślij test (na adres powiadomień)', 'wyslijTest')
    .addItem('Wyślij newsletter (nowa wysyłka)', 'wyslijNowy')
    .addItem('Dokończ przerwaną wysyłkę', 'dokonczWysylke')
    .addSeparator()
    .addItem('Pokaż podsumowanie', 'podsumowanie')
    .addItem('Usuń niepotwierdzone zapisy (starsze niż ' + CONFIG.PENDING_CLEANUP_DAYS + ' dni)', 'usunNiepotwierdzone')
    .addItem('Skonfiguruj arkusze', 'skonfiguruj')
    .addToUi();
}

function wyslijTest() {
  const ui = SpreadsheetApp.getUi();
  const msg = readMessage_();
  if (!msg) return;
  sendNewsletterMail_(CONFIG.NOTIFY_EMAIL, msg, 'TESTOWYtokenNIEDZIALA00');
  ui.alert('Wysłano test na ' + CONFIG.NOTIFY_EMAIL + '. Sprawdź wygląd wiadomości (link „Wypisz się” w teście nie działa).');
}

function wyslijNowy() {
  const ui = SpreadsheetApp.getUi();
  const msg = readMessage_();
  if (!msg) return;
  const n = countStatus_()[STATUS.ACTIVE];
  if (!n) return ui.alert('Brak aktywnych subskrybentów.');
  const ans = ui.alert('Wyślij newsletter',
    'Temat: „' + msg.subject + '”\nOdbiorcy: ' + n + ' (aktywni subskrybenci)\n\n' +
    'Każda osoba dostanie osobną wiadomość z własnym linkiem do wypisania. Wysłać?',
    ui.ButtonSet.YES_NO);
  if (ans !== ui.Button.YES) return;
  // Text ID (not a date) so Sheets does not reformat it.
  const id = 'W-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss');
  msgSheet_().getRange('B4').setValue(id);
  runCampaign_(id, msg);
}

function dokonczWysylke() {
  const ui = SpreadsheetApp.getUi();
  const id = String(msgSheet_().getRange('B4').getValue() || '').trim();
  if (!id) return ui.alert('Nie ma rozpoczętej wysyłki. Użyj „Wyślij newsletter (nowa wysyłka)”.');
  const msg = readMessage_();
  if (!msg) return;
  runCampaign_(id, msg);
}

function runCampaign_(id, msg) {
  const ui = SpreadsheetApp.getUi();
  const sheet = subsSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return ui.alert('Brak subskrybentów.');
  const rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const started = Date.now();
  let sent = 0, left = 0, failed = 0, stoppedBy = '';

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r[COL.STATUS - 1] !== STATUS.ACTIVE || String(r[COL.LAST_SENT - 1]) === id) continue;
    if (stoppedBy) { left++; continue; }
    if (Date.now() - started > 5 * 60 * 1000) { stoppedBy = 'czas'; left++; continue; }
    if (!takeBudget_('newsletter', CONFIG.DAILY_NEWSLETTER_LIMIT)) { stoppedBy = 'limit'; left++; continue; }
    try {
      sendNewsletterMail_(r[COL.EMAIL - 1], msg, r[COL.UNSUB_TOKEN - 1]);
      sheet.getRange(i + 2, COL.LAST_SENT).setValue(safe_(id));
      sent++;
      Utilities.sleep(250);
    } catch (err) {
      failed++;
      log_('BŁĄD WYSYŁKI', r[COL.EMAIL - 1], String(err && err.message || err));
      if (/limit|quota|too many/i.test(String(err))) { stoppedBy = 'limit'; left++; }
    }
  }

  const status = 'Wysyłka ' + id + ': wysłano teraz ' + sent + ', pozostało ' + left +
    (failed ? ', błędy ' + failed + ' (zob. Dziennik)' : '');
  msgSheet_().getRange('B5').setValue(status);
  log_('WYSYŁKA', '', status);
  let extra = '';
  if (stoppedBy === 'limit') extra = '\n\nOsiągnięto dzienny limit wiadomości. Jutro kliknij „Newsletter → Dokończ przerwaną wysyłkę”.';
  if (stoppedBy === 'czas') extra = '\n\nKliknij jeszcze raz „Newsletter → Dokończ przerwaną wysyłkę”, aby wysłać resztę.';
  ui.alert(status + extra);
}

function sendNewsletterMail_(to, msg, unsubToken) {
  const pageUrl = CONFIG.SITE_URL + '/wypisz.html?t=' + unsubToken;
  const footerHtml =
    '<p style="margin:0">Otrzymujesz tę wiadomość, bo zapisałaś/eś się do newslettera „Kuchnia Metodyczna”.<br>' +
    'Nie chcesz go dostawać? <a href="' + pageUrl + '" style="color:#1b1b1a">Wypisz się</a>.</p>';
  const html = layout_(textToHtml_(msg.body), footerHtml);
  const text = msg.body + '\n\n—\nOtrzymujesz tę wiadomość, bo zapisałaś/eś się do newslettera „Kuchnia Metodyczna”.\n' +
    'Wypisz się: ' + pageUrl;

  const appUrl = webAppUrl_();
  const listUnsub = [];
  if (appUrl) listUnsub.push('<' + appUrl + '?action=unsubscribe&t=' + unsubToken + '>');
  listUnsub.push('<mailto:' + CONFIG.REPLY_TO + '?subject=Wypisz%20mnie%20z%20newslettera>');

  if (typeof Gmail !== 'undefined') {
    // Gmail API lets us add List-Unsubscribe headers → Gmail shows its own "Unsubscribe" button.
    const boundary = 'km' + Utilities.getUuid().replace(/-/g, '');
    const from = Session.getEffectiveUser().getEmail();
    const lines = [
      'From: ' + encWord_(CONFIG.SENDER_NAME) + ' <' + from + '>',
      'To: ' + to,
      'Reply-To: ' + CONFIG.REPLY_TO,
      'Subject: ' + encWord_(msg.subject),
      'MIME-Version: 1.0',
      'List-Unsubscribe: ' + listUnsub.join(', ')
    ];
    if (appUrl) lines.push('List-Unsubscribe-Post: List-Unsubscribe=One-Click');
    lines.push(
      'Content-Type: multipart/alternative; boundary="' + boundary + '"', '',
      '--' + boundary,
      'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '',
      b64Lines_(text),
      '--' + boundary,
      'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '',
      b64Lines_(html),
      '--' + boundary + '--', '');
    Gmail.Users.Messages.send({ raw: Utilities.base64EncodeWebSafe(lines.join('\r\n')) }, 'me');
  } else {
    // Fallback if the Gmail service was not added: no Gmail "Unsubscribe" button, footer link still works.
    MailApp.sendEmail({ to: to, subject: msg.subject, body: text, htmlBody: html,
      name: CONFIG.SENDER_NAME, replyTo: CONFIG.REPLY_TO });
  }
}

function readMessage_() {
  const ui = SpreadsheetApp.getUi();
  const sh = msgSheet_();
  const subject = String(sh.getRange('B1').getValue() || '').trim();
  const body = String(sh.getRange('B2').getValue() || '').trim();
  if (!subject || !body) {
    ui.alert('Uzupełnij w arkuszu „' + SHEET_MSG + '” temat (B1) i treść (B2).');
    return null;
  }
  return { subject: subject, body: body };
}

// =============================================================================
// Maintenance
// =============================================================================

function podsumowanie() {
  SpreadsheetApp.getUi().alert('Podsumowanie newslettera', summaryText_(), SpreadsheetApp.getUi().ButtonSet.OK);
}

function usunNiepotwierdzone() {
  const ui = SpreadsheetApp.getUi();
  const sheet = subsSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return ui.alert('Brak wierszy.');
  const rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const limit = Date.now() - CONFIG.PENDING_CLEANUP_DAYS * 864e5;
  const toDelete = [];
  rows.forEach(function (r, i) {
    const d = r[COL.SIGNED - 1];
    if (r[COL.STATUS - 1] === STATUS.PENDING && d instanceof Date && d.getTime() < limit) toDelete.push(i + 2);
  });
  if (!toDelete.length) return ui.alert('Brak niepotwierdzonych zapisów starszych niż ' + CONFIG.PENDING_CLEANUP_DAYS + ' dni.');
  if (ui.alert('Usunąć ' + toDelete.length + ' niepotwierdzonych zapisów?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  toDelete.reverse().forEach(function (rowNum) { sheet.deleteRow(rowNum); });
  log_('PORZĄDKI', '', 'Usunięto niepotwierdzone: ' + toDelete.length);
  ui.alert('Usunięto ' + toDelete.length + ' wierszy.');
}

/** Run once after pasting the code (creates sheets and asks for permissions). */
function skonfiguruj() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);

  let subs = ss.getSheetByName(SHEET_SUBS);
  if (!subs) {
    const first = ss.getSheets()[0];
    subs = (ss.getSheets().length === 1 && first.getLastRow() === 0) ? first.setName(SHEET_SUBS) : ss.insertSheet(SHEET_SUBS);
  }
  subs.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#fde7bd');
  subs.setFrozenRows(1);
  subs.getRange('C:E').setNumberFormat('yyyy-mm-dd hh:mm');
  subs.getRange('H:I').setNumberFormat('@');
  subs.getRange('N:N').setNumberFormat('@');
  subs.setColumnWidth(COL.EMAIL, 240);
  subs.setColumnWidths(COL.CONSENT_TERMS, 2, 260);
  subs.hideColumns(COL.UNSUB_TOKEN, 2);

  let msg = ss.getSheetByName(SHEET_MSG) || ss.insertSheet(SHEET_MSG);
  if (!msg.getRange('A1').getValue()) {
    msg.getRange('A1:A5').setValues([['Temat'], ['Treść'], [''], ['Ostatnia wysyłka (ID)'], ['Status wysyłki']]).setFontWeight('bold');
    msg.getRange('B1').setValue('Nowy odcinek Kuchni Metodycznej: …');
    msg.getRange('B2').setValue('Dzień dobry!\n\nW nowym odcinku podcastu rozmawiamy o …\n\n' +
      'Posłuchaj na Spotify: https://open.spotify.com/show/78JCaoAEl9yniNS0A4y9NV\n' +
      'Obejrzyj na YouTube: https://www.youtube.com/@KuchniaMetodyczna\n\nMagdalena i Justyna');
    msg.getRange('A7').setValue('Jak wysłać: wpisz temat (B1) i treść (B2). Pusta linia = nowy akapit, linki działają automatycznie. ' +
      'Potem menu „Newsletter → Wyślij test”, a gdy wszystko wygląda dobrze: „Wyślij newsletter (nowa wysyłka)”.');
    msg.getRange('B2').setWrap(true).setVerticalAlignment('top');
    msg.setColumnWidth(1, 170);
    msg.setColumnWidth(2, 640);
    msg.setRowHeight(2, 260);
  }

  let logSheet = ss.getSheetByName(SHEET_LOG) || ss.insertSheet(SHEET_LOG);
  if (!logSheet.getRange('A1').getValue()) {
    logSheet.getRange(1, 1, 1, 4).setValues([['Czas', 'Zdarzenie', 'E-mail', 'Szczegóły']]).setFontWeight('bold');
    logSheet.setFrozenRows(1);
  }
  // Touch services so the permission prompt covers everything.
  MailApp.getRemainingDailyQuota();
  try { SpreadsheetApp.getUi().alert('Gotowe! Arkusze są skonfigurowane. Teraz wdroż aplikację internetową (patrz instrukcja).'); } catch (e) {}
}

// =============================================================================
// Helpers
// =============================================================================

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function subsSheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_SUBS);
  if (!sh) throw new Error('Brak arkusza „' + SHEET_SUBS + '” — uruchom funkcję skonfiguruj.');
  return sh;
}

function msgSheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_MSG);
  if (!sh) throw new Error('Brak arkusza „' + SHEET_MSG + '” — uruchom funkcję skonfiguruj.');
  return sh;
}

function findRow_(sheet, col, value) {
  const last = sheet.getLastRow();
  if (last < 2 || !value) return 0;
  const cell = sheet.getRange(2, col, last - 1, 1).createTextFinder(String(value))
    .matchEntireCell(true).matchCase(col !== COL.EMAIL).findNext();
  return cell ? cell.getRow() : 0;
}

function normEmail_(v) {
  const e = String(v || '').trim().toLowerCase();
  return (e.length <= 254 && EMAIL_RE.test(e)) ? e : '';
}

function newToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
}

function clip_(v, n) { return String(v || '').slice(0, n); }

/** Stops values like "=HYPERLINK(...)" from being treated as formulas. */
function safe_(v) {
  return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
}

function fmt_(d) {
  return d instanceof Date ? Utilities.formatDate(d, TZ, 'yyyy-MM-dd HH:mm') : String(d || '');
}

/** Per-day counters so a busy day cannot exhaust the Gmail sending quota. */
function takeBudget_(kind, limit) {
  const props = PropertiesService.getScriptProperties();
  const key = 'cnt:' + kind + ':' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const n = Number(props.getProperty(key) || 0);
  if (n >= limit) return false;
  props.setProperty(key, String(n + 1));
  return true;
}

function countStatus_() {
  const c = {}; c[STATUS.PENDING] = 0; c[STATUS.ACTIVE] = 0; c[STATUS.OUT] = 0;
  const sheet = subsSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return c;
  sheet.getRange(2, COL.STATUS, last - 1, 1).getValues().forEach(function (r) {
    if (r[0] in c) c[r[0]]++;
  });
  return c;
}

function summaryText_() {
  const c = countStatus_();
  return 'aktywni: ' + c[STATUS.ACTIVE] + ', oczekujący na potwierdzenie: ' + c[STATUS.PENDING] +
    ', wypisani: ' + c[STATUS.OUT];
}

function log_(event, email, details) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LOG);
    if (sh) sh.appendRow([new Date(), event, safe_(String(email || '')), safe_(String(details || ''))]);
  } catch (e) { console.warn('log failed', e); }
}

function webAppUrl_() {
  if (CONFIG.WEB_APP_URL) return CONFIG.WEB_APP_URL;
  try {
    const u = ScriptApp.getService().getUrl();
    return /\/exec$/.test(u || '') ? u : '';
  } catch (e) { return ''; }
}

function encWord_(s) {
  return '=?UTF-8?B?' + Utilities.base64Encode(s, Utilities.Charset.UTF_8) + '?=';
}

function b64Lines_(s) {
  return Utilities.base64Encode(s, Utilities.Charset.UTF_8).replace(/(.{76})/g, '$1\r\n');
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Plain text → simple HTML: blank line = paragraph, URLs become links. */
function textToHtml_(text) {
  return String(text).split(/\n\s*\n/).map(function (para) {
    const h = esc_(para.trim()).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g,
      '<a href="$1" style="color:#e07f00;font-weight:bold">$1</a>').replace(/\n/g, '<br>');
    return '<p style="margin:0 0 16px">' + h + '</p>';
  }).join('');
}

function button_(url, label) {
  return '<p style="margin:24px 0"><a href="' + url + '" style="display:inline-block;background:#f7a823;color:#1b1b1a;' +
    'font-weight:bold;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:16px">' + esc_(label) + '</a></p>';
}

function layout_(contentHtml, footerHtml) {
  return '<!doctype html><html><body style="margin:0;background:#fdf8f0">' +
    '<div style="max-width:600px;margin:0 auto;padding:28px 18px;font-family:Arial,Helvetica,sans-serif;color:#1b1b1a;font-size:16px;line-height:1.55">' +
    '<div style="font-weight:bold;font-size:20px;letter-spacing:.04em;margin-bottom:20px">' +
    '<span style="color:#f39200">KUCHNIA</span> METODYCZNA</div>' +
    '<div style="background:#ffffff;border-radius:16px;padding:26px 24px">' + contentHtml + '</div>' +
    '<div style="color:#8a8174;font-size:13px;line-height:1.5;padding:18px 6px">' + footerHtml +
    '<p style="margin:8px 0 0"><a href="' + CONFIG.SITE_URL + '" style="color:#8a8174">kuchniametodyczna.pl</a> · ' +
    '<a href="' + CONFIG.SITE_URL + '/polityka-prywatnosci.html" style="color:#8a8174">Polityka prywatności</a></p>' +
    '</div></div></body></html>';
}
