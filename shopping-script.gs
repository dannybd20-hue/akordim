// Apps Script לאפליקציית הקניות לבית.
// מתקינים בפרויקט Apps Script חדש ונפרד (לא בסקריפט של האקורדים). ההוראות המלאות בצ'אט.
// SHOP_PASSWORD: הסיסמה המשפחתית לאפליקציה.
// NTFY_TOPIC: שם ערוץ ההתראות באפליקציית ntfy. בוחרים שם ארוך שקשה לנחש. ריק = בלי התראות.
const SHOP_PASSWORD = 'כתוב-כאן-סיסמה';
const NTFY_TOPIC = '';
// NTFY_TOKEN: מפתח גישה מחשבון חינמי ב-ntfy.sh. בלעדיו גוגל מגיע מהר למכסה היומית של ntfy.
const NTFY_TOKEN = '';
const DATA_FILE = 'shopping_data.json';

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function load_() {
  const it = DriveApp.getFilesByName(DATA_FILE);
  if (!it.hasNext()) return { f: null, st: shopNew() };
  const f = it.next();
  return { f: f, st: JSON.parse(f.getBlob().getDataAsString('UTF-8')) };
}
function save_(f, st) {
  st.rev = (st.rev || 0) + 1;
  const body = JSON.stringify(st);
  if (f) f.setContent(body); else DriveApp.createFile(DATA_FILE, body, MimeType.PLAIN_TEXT);
}

// שולח התראה לכל הטלפונים שנרשמו לערוץ באפליקציית ntfy
function notify_(lines) {
  if (!NTFY_TOPIC || !lines.length) return;
  try {
    const r = UrlFetchApp.fetch('https://ntfy.sh/', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: NTFY_TOKEN ? { Authorization: 'Bearer ' + NTFY_TOKEN } : {},
      payload: JSON.stringify({ topic: NTFY_TOPIC, title: '🛒 קניות לבית', message: lines.join('\n'), tags: ['shopping_cart'] })
    });
    if (r.getResponseCode() !== 200) console.warn('ntfy ' + r.getResponseCode() + ': ' + r.getContentText());
    return r;
  } catch (x) { console.warn('ntfy: ' + x); }
}

// בדיקה: מריצים מהעורך ורואים ביומן מה שרת ההתראות ענה (200 = נשלח)
function testNtfy() {
  const r = notify_(['🔔 בדיקה מהסקריפט']);
  Logger.log(r ? r.getResponseCode() + ' ' + r.getContentText() : 'לא נשלח: NTFY_TOPIC ריק או שגיאת רשת (ראו אזהרה למעלה)');
}

function doGet() { return out_({ ok: true, app: 'shopping' }); }

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad' }); }
  if (d.password !== SHOP_PASSWORD) return out_({ ok: false, error: 'password' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  const lines = [];
  let st;
  try {
    const l = load_(), now = Date.now();
    st = l.st;
    let changed = false;
    (d.ops || []).forEach(function (o) {
      const before = st.items.length;
      if (!shopApply(st, o, now)) return;
      changed = true;
      if (o.type === 'add' && st.items.length > before) {
        lines.push(o.src === 'pantry' ? '🏠 נגמר בבית: ' + o.name + (o.by ? ' (' + o.by + ')' : '')
                                      : '➕ ' + (o.by || 'מישהו') + ' הוסיף/ה: ' + o.name);
      }
    });
    shopAuto(st, now).forEach(function (n) { lines.push('🔁 נוסף אוטומטית: ' + n); changed = true; });
    if (changed) save_(l.f, st);
  } finally {
    lock.releaseLock();
  }
  notify_(lines);
  return out_(d.rev === st.rev ? { ok: true, rev: st.rev } : { ok: true, rev: st.rev, state: st });
}

// רץ כל שעה: מוסיף פריטים קבועים שהגיע זמנם גם אם אף אחד לא פתח את האפליקציה
function hourly() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let added = [];
  try {
    const l = load_();
    added = shopAuto(l.st, Date.now());
    if (added.length) save_(l.f, l.st);
  } finally {
    lock.releaseLock();
  }
  notify_(added.map(function (n) { return '🔁 נוסף אוטומטית: ' + n; }));
}

// מריצים פעם אחת מהעורך: מאשרים הרשאות, מגדירים בדיקה שעתית ושולחים התראת ניסיון
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'hourly') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('hourly').timeBased().everyHours(1).create();
  const l = load_();
  if (!l.f) save_(null, l.st);
  notify_(['✅ ההתראות של קניות לבית עובדות']);
  Logger.log('מוכן. ' + (NTFY_TOPIC ? 'נשלחה התראת ניסיון לערוץ ' + NTFY_TOPIC : 'התראות כבויות (NTFY_TOPIC ריק)'));
}

/* ---------------- ליבה משותפת (זהה ל-shop-core.js באתר) ---------------- */
/* ליבת אפליקציית הקניות. אותו קוד רץ גם בדף (shopping.html) וגם בסקריפט של גוגל,
   כך שכל שינוי מחושב בדיוק באותה צורה בטלפון ובענן.
   מבנה הנתונים:
     items    - רשימת הקניות: {id, name, qty, by, at, auto?, src?}
     products - מוצרים שיש בבית: {id, name, emoji, img}
     hist     - מתי כל פריט נקנה: {key: {n: שם, t: [זמנים]}}
     skip     - פריט קבוע שנמחק מהרשימה בלי שנקנה: לא להוסיף אותו שוב עד הזמן הזה */
var SHOP_DAY = 864e5;

function shopKey(n) {
  return String(n || '').replace(/[֑-ׇ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
function shopNew() { return { items: [], products: [], hist: {}, skip: {}, rev: 0 }; }
function shopFind(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return i; return -1; }
function shopHasKey(st, key) { return st.items.some(function (x) { return shopKey(x.name) === key; }); }
function shopMedian(a) {
  a = a.slice().sort(function (x, y) { return x - y; });
  var m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/* פריט נחשב קבוע אחרי 3 קניות לפחות, כשהמרווחים ביניהן דומים (סטייה עד 35%) ולפחות יום */
function shopRecurring(st, key) {
  var h = st.hist[key];
  if (!h || h.t.length < 3) return null;
  var t = h.t.slice(-7), iv = [];
  for (var i = 1; i < t.length; i++) iv.push(t[i] - t[i - 1]);
  var m = shopMedian(iv);
  if (m < SHOP_DAY) return null;
  if (shopMedian(iv.map(function (x) { return Math.abs(x - m); })) > m * 0.35) return null;
  return { key: key, name: h.n, every: m, next: t[t.length - 1] + m };
}
function shopAllRecurring(st) {
  return Object.keys(st.hist).map(function (k) { return shopRecurring(st, k); }).filter(Boolean)
    .sort(function (a, b) { return a.next - b.next; });
}

/* מוסיף לרשימה פריטים קבועים שהגיע זמנם. מחזיר את השמות שנוספו */
function shopAuto(st, now) {
  var added = [];
  shopAllRecurring(st).forEach(function (r) {
    if (now < r.next || (st.skip[r.key] && now < st.skip[r.key]) || shopHasKey(st, r.key)) return;
    st.items.push({ id: 'auto-' + r.key + '-' + Math.round(r.next), name: r.name, qty: '', by: '', at: now, auto: true });
    added.push(r.name);
  });
  return added;
}

/* מחיל פעולה אחת על הנתונים. מחזיר true אם משהו השתנה */
function shopApply(st, o, now) {
  var i, k, it, h, r;
  switch (o.type) {
    case 'add':
      k = shopKey(o.name);
      if (!k) return false;
      for (i = 0; i < st.items.length; i++) {
        if (shopKey(st.items[i].name) === k) { if (o.qty) st.items[i].qty = o.qty; return !!o.qty; }
      }
      st.items.push({ id: o.iid, name: String(o.name).trim(), qty: o.qty || '', by: o.by || '', at: now, src: o.src || '' });
      return true;
    case 'edit':
      i = shopFind(st.items, o.iid);
      if (i < 0) return false;
      if (o.name !== undefined && shopKey(o.name)) st.items[i].name = String(o.name).trim();
      if (o.qty !== undefined) st.items[i].qty = o.qty;
      return true;
    case 'bought':
      i = shopFind(st.items, o.iid);
      if (i < 0) return false;
      it = st.items.splice(i, 1)[0];
      k = shopKey(it.name);
      h = st.hist[k] || (st.hist[k] = { n: it.name, t: [] });
      h.n = it.name;
      h.t.push(now);
      if (h.t.length > 12) h.t.shift();
      delete st.skip[k];
      return true;
    case 'del':
      i = shopFind(st.items, o.iid);
      if (i < 0) return false;
      it = st.items.splice(i, 1)[0];
      if (it.auto) {
        k = shopKey(it.name);
        r = shopRecurring(st, k);
        st.skip[k] = now + (r ? r.every : 7 * SHOP_DAY);
      }
      return true;
    case 'restore': // ביטול של "נקנה"
      it = o.item;
      k = shopKey(it.name);
      if (!shopHasKey(st, k)) st.items.push(it);
      h = st.hist[k];
      if (h && h.t.length && now - h.t[h.t.length - 1] < 15 * 60e3) h.t.pop();
      return true;
    case 'forget': // להפסיק להוסיף פריט קבוע אוטומטית
      delete st.hist[o.key];
      delete st.skip[o.key];
      return true;
    case 'padd':
      if (!shopKey(o.name) || shopFind(st.products, o.pid) >= 0) return false;
      if (st.products.some(function (p) { return shopKey(p.name) === shopKey(o.name); })) return false;
      st.products.push({ id: o.pid, name: String(o.name).trim(), emoji: o.emoji || '', img: o.img || '' });
      return true;
    case 'pedit':
      i = shopFind(st.products, o.pid);
      if (i < 0) return false;
      ['name', 'emoji', 'img'].forEach(function (f) { if (o[f] !== undefined) st.products[i][f] = o[f]; });
      return true;
    case 'pdel':
      i = shopFind(st.products, o.pid);
      if (i < 0) return false;
      st.products.splice(i, 1);
      return true;
  }
  return false;
}
