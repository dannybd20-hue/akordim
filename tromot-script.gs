/**
 * גיבוי לענן לאפליקציית "תרומות בית כנסת".
 *
 * מה הסקריפט עושה:
 *  - שומר את כל התרומות בקובץ בגוגל דרייב שלך (תיקייה "גיבוי תרומות בית כנסת").
 *  - מעדכן גיליון גוגל "תרומות בית כנסת" עם טבלה קריאה של כל התרומות.
 *  - שומר עותק יומי של הנתונים (נשמרים 60 הימים האחרונים), כדי שאפשר יהיה לחזור אחורה.
 *
 * התקנה (פעם אחת, עדיף מהמחשב):
 *  1. פתח https://script.google.com ולחץ "פרויקט חדש".
 *  2. מחק את מה שכתוב שם והדבק את כל הקוד הזה.
 *  3. שנה את הסיסמה בשורה של PASSWORD למטה לסיסמה משלך.
 *  4. לחץ "פריסה" ← "פריסה חדשה" ← סוג: "אפליקציית אינטרנט".
 *     "הפעלה בתור": אני.  "למי יש גישה": כל אחד.  ואז "פריסה" ואישור ההרשאות.
 *  5. העתק את "כתובת האפליקציה" (מתחילה ב-https://script.google.com/macros/s/...)
 *     והדבק אותה באפליקציה, בכפתור "☁️ גיבוי לענן", יחד עם הסיסמה.
 *
 * עדכון קוד: אחרי הדבקת גרסה חדשה צריך "פריסה" ← "ניהול פריסות" ← ✏️ ← "גרסה חדשה" ← "פריסה".
 */

const ADMIN_PASSWORD = 'כתוב-כאן-את-הסיסמה-הראשית'; // סיסמת המנהל (הסיסמה הראשית): מתקבלת תמיד ומבטלת חסימה של ניסיונות שגויים
const PASSWORD = '1234'; // ← שנה לסיסמה משלך
const FOLDER_NAME = 'גיבוי תרומות בית כנסת';
const KEEP_DAYS = 60;

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false, error: 'bad request' }); }
  if (req.action === 'board') return boardPublic_(req);
  const pw = String(req.password || '').trim();
  if (!isAdmin_(pw)) {
    if (locked_('tromot')) return out({ ok: false, error: 'locked' });
    if (pw !== PASSWORD) { failed_('tromot'); return out({ ok: false, error: 'password' }); }
  }
  passed_('tromot');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (req.action === 'board_list' || req.action === 'board_set') { lock.releaseLock(); return boardAdmin_(req); }
    if (req.action === 'inv_load') return out({ ok: true, inv: invRead_() });
    if (req.action === 'inv_save') return out({ ok: true, inv: invWrite_(req.inv || {}) });
    if (req.action === 'check') return out({ ok: true });
    if (req.action === 'load') {
      const d = readData();
      return out({ ok: true, donations: d.donations, savedAt: d.savedAt });
    }
    if (req.action === 'save') {
      if (!Array.isArray(req.donations)) return out({ ok: false, error: 'no data' });
      const savedAt = Date.now();
      writeData({ donations: req.donations, savedAt: savedAt });
      writeSheet(req.donations);
      dailySnapshot(req.donations);
      return out({ ok: true, savedAt: savedAt });
    }
    return out({ ok: false, error: 'unknown action' });
  } finally {
    lock.releaseLock();
  }
}

/* חסימה נגד ניחוש סיסמאות: אחרי 5 סיסמאות שגויות הסקריפט לא מקבל שום סיסמה
   עד שעוברות 15 דקות בלי ניסיון שגוי. */
const MAX_FAILS = 5, LOCK_MINUTES = 15;
function locked_(scope) { return Number(CacheService.getScriptCache().get('fails_' + scope) || 0) >= MAX_FAILS; }
function failed_(scope) {
  const c = CacheService.getScriptCache(), k = 'fails_' + scope;
  c.put(k, String(Number(c.get(k) || 0) + 1), LOCK_MINUTES * 60);
}
function passed_(scope) { CacheService.getScriptCache().remove('fails_' + scope); }
/* סיסמת המנהל (ADMIN_PASSWORD) תמיד מתקבלת, וגם מבטלת חסימה של "יותר מדי ניסיונות שגויים" */
function isAdmin_(p) { return typeof ADMIN_PASSWORD === 'string' && ADMIN_PASSWORD.indexOf('כתוב-כאן') !== 0 && p === ADMIN_PASSWORD; }

function doGet(e) {
  if (e && e.parameter && e.parameter.board) return boardLink_(e.parameter);
  return out({ ok: true, app: 'tromot-backup' });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function folder() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function dataFile() {
  const f = folder(), it = f.getFilesByName('tromot.json');
  return it.hasNext() ? it.next() : f.createFile('tromot.json', JSON.stringify({ donations: [], savedAt: 0 }), MimeType.PLAIN_TEXT);
}

function readData() {
  try { return JSON.parse(dataFile().getBlob().getDataAsString('UTF-8')); }
  catch (x) { return { donations: [], savedAt: 0 }; }
}

function writeData(d) {
  dataFile().setContent(JSON.stringify(d));
}

function fmt(d) { return d ? String(d).split('-').reverse().join('/') : ''; }

function writeSheet(list) {
  const props = PropertiesService.getScriptProperties();
  let ss = null, id = props.getProperty('SHEET_ID');
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (x) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('תרומות בית כנסת');
    DriveApp.getFileById(ss.getId()).moveTo(folder());
    props.setProperty('SHEET_ID', ss.getId());
  }
  const sh = ss.getSheets()[0];
  sh.setName('תרומות');
  sh.setRightToLeft(true);
  sh.clear();
  const rows = [['תאריך', 'שם התורם', 'סכום', 'אמצעי תשלום', 'על מה נתן', 'הערה', 'שומש?', 'שומש עבור', 'תאריך שימוש']];
  list.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (b.seq || b.id) - (a.seq || a.id))
    .forEach(d => rows.push([fmt(d.date), d.name || '', Number(d.amount) || 0, d.method || '', d.purpose || '', d.note || '',
      d.used ? 'כן' : 'לא', d.usedFor || '', fmt(d.usedDate)]));
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#efe5dc');
  sh.setFrozenRows(1);
}

function dailySnapshot(list) {
  const f = folder(), day = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const name = 'גיבוי ' + day + '.json', it = f.getFilesByName(name);
  if (it.hasNext()) it.next().setContent(JSON.stringify(list));
  else f.createFile(name, JSON.stringify(list), MimeType.PLAIN_TEXT);
  const cutoff = Date.now() - KEEP_DAYS * 864e5, all = f.getFiles();
  while (all.hasNext()) {
    const x = all.next();
    if (/^גיבוי \d{4}-\d{2}-\d{2}\.json$/.test(x.getName()) && x.getDateCreated().getTime() < cutoff) x.setTrashed(true);
  }
}

/* ---------------- לוח מודעות (צפייה ציבורית עם אישור) ----------------
   הקישור: https://dannybd20-hue.github.io/akordim/board.html?k=<מזהה הפריסה>. אפשר להעתיק אותו מאפליקציית התרומות.
   מי שנכנס בפעם הראשונה כותב שם, ונשלח אליך מייל עם כפתור "לאשר". אחרי אישור המכשיר נכנס תמיד.
   הלוח מציג רק מספרים: יתרה, סך התרומות, תרומות שנכנסו (תאריך וסכום, בלי שם) ועל מה הכסף שומש.
   אחרי ההדבקה: מריצים פעם אחת את setupBoard (לאישור הרשאת שליחת מייל), ואז "גרסה חדשה" בפריסה. */
const BOARD_TITLE = 'בית כנסת איחוד הצלה';
const BOARD_MAX_PENDING = 30;

function boardGet_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('BOARD') || '{}'); } catch (x) { return {}; } }
function boardPut_(b) { PropertiesService.getScriptProperties().setProperty('BOARD', JSON.stringify(b)); }

function boardData_() {
  const raw = readData(), D = (raw.donations || []).filter(function (d) { return Number(d.amount) > 0; });
  let tot = 0, used = 0;
  const ex = {};
  D.forEach(function (d) {
    const a = Number(d.amount); tot += a;
    if (d.used) {
      used += a;
      if (!String(d.usedFor || '').trim()) return; // בלי לכתוב על מה: נספר בסכום, לא מוצג ברשימה
      const k = (d.usedFor || '') + '|' + (d.usedDate || '');
      ex[k] = ex[k] || { f: String(d.usedFor || '').slice(0, 80), d: d.usedDate || '', a: 0 };
      ex[k].a += a;
    }
  });
  const dons = D.map(function (d) { return { d: d.date || '', a: Number(d.amount) }; })
    .sort(function (x, y) { return String(y.d).localeCompare(String(x.d)); }).slice(0, 300);
  const exl = Object.keys(ex).map(function (k) { return ex[k]; }).sort(function (x, y) { return String(y.d).localeCompare(String(x.d)); });
  const inv = invRead_();
  return { title: BOARD_TITLE, tot: tot, used: used, avail: tot - used, n: D.length, dons: dons, ex: exl, at: raw.savedAt || 0, inv: { items: inv.items.map(function (x) { return { n: x.n, c: x.c, st: x.st, q: x.q == null ? null : x.q }; }), wa: inv.wa } };
}

/* בקשה מהלוח הציבורי: {action:'board', dev, name} */
function boardPublic_(req) {
  const dev = String(req.dev || '').replace(/[^\w-]/g, '').slice(0, 40);
  if (dev.length < 10) return out({ ok: false, error: 'bad' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let x, b;
  try {
    b = boardGet_(); b.devs = b.devs || {};
    x = b.devs[dev];
    if (!x) {
      const name = String(req.name || '').trim().slice(0, 40);
      if (!name) return out({ ok: true, status: 'name' });
      const pend = Object.keys(b.devs).filter(function (k) { return b.devs[k].st === 'p'; }).length;
      if (pend >= BOARD_MAX_PENDING) return out({ ok: true, status: 'busy' });
      x = b.devs[dev] = { n: name, st: 'p', t: Date.now(), k: Utilities.getUuid().replace(/-/g, '').slice(0, 20) };
      boardPut_(b);
      boardMail_(dev, x);
      return out({ ok: true, status: 'pending' });
    }
    if (x.st === 'a') {
      if (!x.seen || Date.now() - x.seen > 3e5) { x.seen = Date.now(); boardPut_(b); }
    }
  } finally { lock.releaseLock(); }
  if (x.st === 'a') return out({ ok: true, status: 'ok', data: boardData_() });
  return out({ ok: true, status: x.st === 'd' ? 'denied' : 'pending' });
}

function boardMail_(dev, x) {
  try {
    const url = ScriptApp.getService().getUrl();
    const a = url + '?board=a&d=' + encodeURIComponent(dev) + '&k=' + x.k, d = url + '?board=d&d=' + encodeURIComponent(dev) + '&k=' + x.k;
    const esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      subject: 'בקשת צפייה בלוח המודעות: ' + x.n,
      htmlBody: '<div dir="rtl" style="font-family:Arial;font-size:16px">' +
        '<p><b>' + esc(x.n) + '</b> מבקש לצפות בלוח המודעות של ' + esc(BOARD_TITLE) + '.</p>' +
        '<p><a href="' + a + '" style="background:#5d7b4f;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">✅ לאשר</a>' +
        ' &nbsp; <a href="' + d + '" style="background:#b3261e;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">❌ לדחות</a></p>' +
        '<p style="color:#777;font-size:13px">אפשר לאשר, לדחות ולבטל גם מאפליקציית התרומות ← "📋 לוח מודעות".</p></div>'
    });
  } catch (e) { console.warn('mail: ' + e); }
}

/* לחיצה על הכפתור במייל */
function boardLink_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let msg = 'הקישור לא תקף';
  try {
    const b = boardGet_(); b.devs = b.devs || {};
    const x = b.devs[String(p.d || '')];
    if (x && x.k === String(p.k || '')) {
      x.st = p.board === 'a' ? 'a' : 'd'; x.at = Date.now(); boardPut_(b);
      msg = p.board === 'a' ? '✅ אושר: ' + x.n + ' יכול לצפות בלוח' : '❌ נדחה: ' + x.n;
    }
  } finally { lock.releaseLock(); }
  return HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width,initial-scale=1"><div dir="rtl" style="font-family:Arial;font-size:22px;text-align:center;padding:60px 20px">' + msg + '</div>');
}

/* ניהול מתוך האפליקציה (עם סיסמה): רשימת בקשות ושינוי מצב */
function boardAdmin_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const b = boardGet_(); b.devs = b.devs || {};
    if (req.action === 'board_set') {
      const id = String(req.dev || '');
      if (b.devs[id]) { if (req.st === 'x') delete b.devs[id]; else { b.devs[id].st = req.st === 'a' ? 'a' : 'd'; b.devs[id].at = Date.now(); } boardPut_(b); }
    }
    const list = Object.keys(b.devs).map(function (k) { const x = b.devs[k]; return { dev: k, n: x.n, st: x.st, t: x.t, seen: x.seen || 0 }; })
      .sort(function (x, y) { return (x.st === 'p' ? 0 : 1) - (y.st === 'p' ? 0 : 1) || y.t - x.t; });
    return out({ ok: true, devs: list });
  } finally { lock.releaseLock(); }
}

// מריצים פעם אחת מהעורך: מאשרים את הרשאת המייל ומקבלים מייל ניסיון
function setupBoard() {
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'לוח המודעות מוכן', 'מעכשיו תקבל כאן בקשות צפייה בלוח המודעות של ' + BOARD_TITLE + '.');
  Logger.log('נשלח מייל ניסיון ל-' + Session.getEffectiveUser().getEmail());
}

/* ---------------- מלאי ציוד בבית הכנסת ----------------
   נשמר בקובץ inventory.json בתיקיית הגיבוי. מוצג גם בלוח המודעות, עם כפתור "אני רוצה לתרום" שפותח וואטסאפ למספר שהוגדר. */
const INV_DEFAULT = [
  ['שתייה', ['שתייה קלה']],
  ['חד פעמי', ['מזלגות', 'כפיות', 'שקיות זבל', 'טישו', 'קערות הגשה קטנות', 'צלחות קטנות', 'צלחות גדולות', 'מפות', 'כוסות']],
  ['קידוש', ['יין לקידוש', 'קרקרים', 'כוסות קידוש']]
];
function invFile_() {
  const f = folder(), it = f.getFilesByName('inventory.json');
  if (it.hasNext()) return it.next();
  let n = 0; const items = [];
  INV_DEFAULT.forEach(function (g) { g[1].forEach(function (name) { items.push({ id: 'i' + (++n), n: name, c: g[0], st: 'ok' }); }); });
  return f.createFile('inventory.json', JSON.stringify({ items: items, wa: '', rev: 1 }), MimeType.PLAIN_TEXT);
}
function invRead_() { try { return JSON.parse(invFile_().getBlob().getDataAsString('UTF-8')); } catch (x) { return { items: [], wa: '', rev: 0 }; } }
function invWrite_(inv) {
  const clean = {
    items: (inv.items || []).slice(0, 300).map(function (x) { return { id: String(x.id || '').slice(0, 20), n: String(x.n || '').slice(0, 60), c: String(x.c || '').slice(0, 30), st: ['ok', 'low', 'out'].indexOf(x.st) >= 0 ? x.st : 'ok', q: x.q === '' || x.q == null || isNaN(Number(x.q)) ? null : Math.max(0, Number(x.q)) }; }).filter(function (x) { return x.id && x.n; }),
    wa: String(inv.wa || '').replace(/[^\d]/g, '').slice(0, 15),
    rev: (Number(invRead_().rev) || 0) + 1
  };
  invFile_().setContent(JSON.stringify(clean));
  return clean;
}
