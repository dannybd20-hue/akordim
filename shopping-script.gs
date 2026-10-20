// Apps Script לאפליקציית הקניות לבית.
// מתקינים בפרויקט Apps Script חדש ונפרד (לא בסקריפט של האקורדים). ההוראות המלאות בצ'אט.
// SHOP_PASSWORD: הסיסמה המשפחתית לאפליקציה.
// FAMILY: שם במשפחה -> מייל. ההודעה נשלחת לכל מי שברשימה חוץ ממי שהוסיף את הפריט.
//         השמות צריכים להיות כמו בכפתורי "מי אני" באפליקציה. ריק = בלי התראות.
const SHOP_PASSWORD = 'כתוב-כאן-סיסמה';
const FAMILY = {};
const APP_URL = 'https://dannybd20-hue.github.io/akordim/shopping.html';
const FEMALE = ['ציפי']; // לניסוח "הוסיפה" במקום "הוסיף"
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

/* ---------------- התראות במייל ----------------
   entries: [{n: שם, q: כמות, k: 'add' | 'pantry' | 'auto'}]
   המייל נשלח לכל בני המשפחה חוץ מהשולח. אפליקציית Gmail בטלפון מקפיצה עליו התראה */
function esc_(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function notify_(entries, from, title) {
  const to = Object.keys(FAMILY).filter(function (n) { return n !== from; }).map(function (n) { return FAMILY[n]; });
  if (!to.length || !entries.length) return;
  try {
    let products = [];
    try { products = load_().st.products; } catch (x) {}
    const verb = FEMALE.indexOf(from) >= 0 ? 'הוסיפה' : 'הוסיף';
    const names = entries.map(function (e) { return e.n; });
    const head = title || (from ? from + ' ' + verb + ' לרשימה' : entries.every(function (e) { return e.k === 'auto'; }) ? 'נוסף אוטומטית לרשימה' : 'נוסף לרשימת הקניות');
    const subject = '🛒 ' + head + ': ' + names.slice(0, 3).join(', ') + (names.length > 3 ? ' ועוד ' + (names.length - 3) : '');
    const inline = {};
    const rows = entries.map(function (e, i) {
      const p = products.filter(function (x) { return shopKey(x.name) === shopKey(e.n); })[0];
      let pic;
      const m = p && p.img && /^data:(image\/\w+);base64,(.+)$/.exec(p.img);
      if (m) {
        inline['p' + i] = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'p' + i + '.jpg');
        pic = '<img src="cid:p' + i + '" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:12px;object-fit:cover" alt="">';
      } else {
        pic = '<div style="width:48px;height:48px;line-height:48px;border-radius:12px;background:#fde8f0;text-align:center;font-size:26px">' + ((p && p.emoji) || shopEmoji(e.n)) + '</div>';
      }
      const tag = e.k === 'pantry' ? '🏠 נגמר בבית' : e.k === 'auto' ? '🔁 נוסף אוטומטית' : '';
      return '<tr><td style="padding:8px 0;width:48px">' + pic + '</td>' +
        '<td style="padding:8px 12px;font:700 17px Arial,sans-serif;color:#1e293b">' + esc_(e.n) +
        (tag ? '<div style="font:400 12px Arial,sans-serif;color:#be185d;margin-top:2px">' + tag + '</div>' : '') + '</td>' +
        '<td style="padding:8px 0;text-align:left;white-space:nowrap">' + (e.q ? '<span style="display:inline-block;background:#db2777;color:#fff;border-radius:99px;padding:3px 11px;font:700 13px Arial,sans-serif">× ' + esc_(e.q) + '</span>' : '') + '</td></tr>';
    }).join('<tr><td colspan="3" style="border-top:1px solid #f9d5e3;font-size:0;line-height:0">&nbsp;</td></tr>');
    const html =
      '<div dir="rtl" style="background:#fdf2f8;padding:24px 12px;font-family:Arial,sans-serif">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:460px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(219,39,119,.12)">' +
      '<tr><td style="background:linear-gradient(135deg,#f472b6,#db2777);background-color:#db2777;padding:22px 24px;color:#fff">' +
      '<div style="font:900 22px Arial,sans-serif">🛒 קניות לבית</div>' +
      '<div style="font:400 15px Arial,sans-serif;opacity:.92;margin-top:4px">' + esc_(head) + '</div></td></tr>' +
      '<tr><td style="padding:10px 24px 4px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" dir="rtl">' + rows + '</table></td></tr>' +
      '<tr><td style="padding:18px 24px 26px;text-align:center">' +
      '<a href="' + APP_URL + '" style="display:inline-block;background:#db2777;color:#fff;text-decoration:none;font:700 16px Arial,sans-serif;padding:13px 30px;border-radius:14px">לרשימת הקניות ←</a>' +
      '</td></tr></table>' +
      '<div style="text-align:center;color:#a1889a;font:12px Arial,sans-serif;margin-top:14px">נשלח אוטומטית מאפליקציית הקניות של המשפחה</div></div>';
    const text = head + '\n' + entries.map(function (e) { return '• ' + e.n + (e.q ? ' (' + e.q + ')' : ''); }).join('\n') + '\n\nלרשימת הקניות: ' + APP_URL;
    MailApp.sendEmail({ to: to.join(','), subject: subject, body: text, htmlBody: html, inlineImages: inline, name: 'קניות לבית' });
    return to;
  } catch (x) { console.warn('mail: ' + x); }
}

// בדיקה: מריצים מהעורך, ומגיע מייל לדוגמה לכל בני המשפחה
function testMail() {
  const to = notify_([{ n: 'חלב', q: '2', k: 'add' }, { n: 'במבה', k: 'pantry' }, { n: 'לחם', k: 'auto' }], '', 'מייל לדוגמה');
  Logger.log(to ? 'נשלח ל: ' + to.join(', ') + ' (נשארו היום: ' + MailApp.getRemainingDailyQuota() + ')'
                : 'לא נשלח: FAMILY ריק או שגיאה (ראו אזהרה למעלה)');
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
      const pending = o.type === 'notify' ? shopPending(st).map(function (x) { return { n: x.name, q: x.qty, k: x.src === 'pantry' ? 'pantry' : 'add' }; }) : [];
      const before = st.items.length;
      if (!shopApply(st, o, now)) return;
      changed = true;
      if (o.type === 'add' && o.notify && st.items.length > before) {
        lines.push({ n: o.name, q: o.qty, k: o.src === 'pantry' ? 'pantry' : 'add' });
      }
      pending.forEach(function (e) { lines.push(e); });
    });
    shopAuto(st, now).forEach(function (n) { lines.push({ n: n, k: 'auto' }); changed = true; });
    if (changed) save_(l.f, st);
  } finally {
    lock.releaseLock();
  }
  notify_(lines, d.by);
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
  notify_(added.map(function (n) { return { n: n, k: 'auto' }; }));
}

// מריצים פעם אחת מהעורך: מאשרים הרשאות, מגדירים בדיקה שעתית ושולחים התראת ניסיון
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'hourly') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('hourly').timeBased().everyHours(1).create();
  const l = load_();
  if (!l.f) save_(null, l.st);
  notify_([{ n: 'ההתראות של קניות לבית עובדות ✅' }], '', 'הכול מוכן');
  Logger.log('מוכן. ' + (Object.keys(FAMILY).length ? 'נשלח מייל ניסיון ל: ' + Object.keys(FAMILY).join(', ') : 'התראות כבויות (FAMILY ריק)'));
}

/* ---------------- ליבה משותפת (זהה ל-shop-core.js באתר) ---------------- */
/* ליבת אפליקציית הקניות. אותו קוד רץ גם בדף (shopping.html) וגם בסקריפט של גוגל,
   כך שכל שינוי מחושב בדיוק באותה צורה בטלפון ובענן.
   מבנה הנתונים:
     items    - רשימת הקניות: {id, name, qty, by, at, auto?, src?, ntf?}
                ntf === false: עוד לא נשלחה הודעה על הפריט (מחכה לכפתור "שלח הודעה")
     products - מוצרים שיש בבית: {id, name, emoji, img, stock}
     hist     - מתי כל פריט נקנה: {key: {n: שם, t: [זמנים]}}
     skip     - פריט קבוע שנמחק מהרשימה בלי שנקנה: לא להוסיף אותו שוב עד הזמן הזה */
var SHOP_DAY = 864e5;

function shopKey(n) {
  return String(n || '').replace(/[֑-ׇ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
/* אימוג'י לפי שם המוצר, כשאין לו תמונה */
var SHOP_EMO = [['חלב|שוקו|יוגורט|לבן|אשל|מעדן','🥛'],['לחם|לחמני|פיתה|חלה|באגט','🍞'],['ביצ','🥚'],['גבינ|קוטג|צהובה|שמנת','🧀'],['חמאה|מרגרינה','🧈'],
['עגבני','🍅'],['מלפפו','🥒'],['בננ','🍌'],['תפוח עץ|תפוחים|תפוח$','🍎'],['תפוז|קלמנטינ','🍊'],['אבטיח|מלון','🍉'],['ענב','🍇'],['תות','🍓'],['לימו','🍋'],['אבוקדו','🥑'],
['בצל','🧅'],['שום','🧄'],['תפוחי אדמה|תפו"א|בטטה','🥔'],['גזר','🥕'],['פלפל','🫑'],['חסה|כרוב|עלים','🥬'],['ברוקולי|כרובית','🥦'],['תירס','🌽'],['פטרי','🍄'],
['אורז','🍚'],['פסטה|ספגטי|אטריות|פתיתים','🍝'],['קמח','🌾'],['סוכר|ממתק','🍬'],['שמן|זית','🫒'],['מלח|תבלין|פפריקה','🧂'],['קפה|נס','☕'],['תה','🍵'],['דבש|ריבה|ממרח','🍯'],
['מים','💧'],['שתיה|קולה|סודה|ספרייט','🥤'],['מיץ|פטל','🧃'],['יין','🍷'],['בירה','🍺'],['עוף|שניצל|כרעיים|חזה','🍗'],['בשר|טחון|סטייק|אנטריקוט','🥩'],['דג|סלמון|טונה','🐟'],['נקניק|פסטרמה','🌭'],
['שוקולד|נוטלה','🍫'],['עוגי|ופל|ביסקוו','🍪'],['במבה|בוטנ','🥜'],['ביסלי|חטיף|צ׳יפס|ציפס|תפוציפס','🍿'],['גלידה|ארטיק','🍦'],['עוג','🍰'],['קורנפלקס|דגני','🥣'],['חומוס|שעועית|עדשים','🫘'],['פיצה','🍕'],
['נייר טואלט|טישו|מגבות נייר|מפיות','🧻'],['מגבונ','🧻'],['סבון','🧼'],['שמפו|מרכך שיער|קרם|דאודורנט','🧴'],['כביסה|מרכך כביסה','🧺'],['ספוג|סקוטש','🧽'],['חיתול','👶'],['אשפה|זבל','🗑️'],
['שקיות|שקית','🛍️'],['משחת שיניים|מברשת שיניים','🪥'],['כלים|פיירי','🫧'],['נרות','🕯️'],['סוללות','🔋'],['תרופ|אקמול','💊']];
function shopEmoji(n) {
  n = shopKey(n);
  for (var i = 0; i < SHOP_EMO.length; i++) if (new RegExp(SHOP_EMO[i][0]).test(n)) return SHOP_EMO[i][1];
  return '🛒';
}
function shopNew() { return { items: [], products: [], hist: {}, skip: {}, rev: 0 }; }
function shopFind(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return i; return -1; }
function shopProd(st, name) {
  var k = shopKey(name);
  for (var i = 0; i < st.products.length; i++) if (shopKey(st.products[i].name) === k) return st.products[i];
  return null;
}
function shopPending(st) { return st.items.filter(function (x) { return x.ntf === false; }); }
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
      st.items.push({ id: o.iid, name: String(o.name).trim(), qty: o.qty || '', by: o.by || '', at: now, src: o.src || '', ntf: !!o.notify });
      return true;
    case 'notify': // נשלחה הודעה על כל הפריטים שחיכו
      if (!shopPending(st).length) return false;
      st.items.forEach(function (x) { if (x.ntf === false) x.ntf = true; });
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
      var p = shopProd(st, it.name); // מה שנקנה נכנס למלאי בבית
      if (p) p.stock = (p.stock || 0) + (parseInt(it.qty, 10) || 1);
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
      st.products.push({ id: o.pid, name: String(o.name).trim(), emoji: o.emoji || '', img: o.img || '', stock: o.stock || 0 });
      return true;
    case 'pedit':
      i = shopFind(st.products, o.pid);
      if (i < 0) return false;
      ['name', 'emoji', 'img', 'stock'].forEach(function (f) { if (o[f] !== undefined) st.products[i][f] = o[f]; });
      return true;
    case 'pstock': // שינוי הכמות שיש בבית
      i = shopFind(st.products, o.pid);
      if (i < 0) return false;
      st.products[i].stock = Math.max(0, (st.products[i].stock || 0) + o.delta);
      return true;
    case 'pdel':
      i = shopFind(st.products, o.pid);
      if (i < 0) return false;
      st.products.splice(i, 1);
      return true;
  }
  return false;
}
