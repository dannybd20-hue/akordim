// Apps Script לאפליקציית הקניות לבית.
// מתקינים בפרויקט Apps Script חדש ונפרד (לא בסקריפט של האקורדים). ההוראות המלאות בצ'אט.
// SHOP_PASSWORD: הסיסמה המשפחתית לאפליקציה.
// FAMILY: שם במשפחה -> מייל. ההודעה נשלחת לכל מי שברשימה חוץ ממי שהוסיף את הפריט.
//         השמות צריכים להיות כמו בכפתורי "מי אני" באפליקציה. ריק = בלי התראות.
const SHOP_PASSWORD = 'כתוב-כאן-סיסמה';
const FAMILY = {};
const APP_URL = 'https://dannybd20-hue.github.io/akordim/shopping.html';
const FEMALE = ['ציפי']; // לניסוח "הוסיפה" במקום "הוסיף"
// EN_PASSWORD: קוד נוסף שפותח את אותה רשימת קניות (באפליקציה באנגלית). ריק = כבוי.
const EN_PASSWORD = '';
const DATA_FILE = 'shopping_data.json';
// MAASER_PASSWORD: סיסמה נפרדת לאפליקציית המעשר (הנתונים נשמרים בקובץ נפרד, maaser_data.json)
const MAASER_PASSWORD = 'כתוב-כאן-סיסמת-מעשר';
const MAASER_FILE = 'maaser_data.json';
// ADMIN_PASSWORD: הסיסמה הראשית של דף הבית. מי שנכנס איתה רואה בדף הבית מי מחובר עכשיו.
const ADMIN_PASSWORD = 'כתוב-כאן-את-הסיסמה-הראשית';

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
/* מוצר שהוקלד באנגלית (למשל Milk) נשמר בעברית (חלב), כדי שהרשימה וההודעות לקבוצה יהיו בעברית.
   שם שלא ברשימה נשאר כמו שהוקלד. אפשר להוסיף מוצרים: 'english name': 'עברית' */
const EN2HE = {
  'milk': 'חלב', 'bread': 'לחם', 'egg': 'ביצים', 'eggs': 'ביצים', 'yellow cheese': 'גבינה צהובה', 'cheese': 'גבינה', 'cottage cheese': 'קוטג׳', 'cottage': 'קוטג׳',
  'white cheese': 'גבינה לבנה', 'yogurt': 'יוגורט', 'yoghurt': 'יוגורט', 'butter': 'חמאה', 'cream': 'שמנת', 'tomato': 'עגבניות', 'tomatoes': 'עגבניות',
  'cucumber': 'מלפפונים', 'cucumbers': 'מלפפונים', 'banana': 'בננות', 'bananas': 'בננות', 'apple': 'תפוחים', 'apples': 'תפוחים', 'onion': 'בצל', 'onions': 'בצל',
  'potato': 'תפוחי אדמה', 'potatoes': 'תפוחי אדמה', 'sweet potato': 'בטטה', 'rice': 'אורז', 'pasta': 'פסטה', 'oil': 'שמן', 'coffee': 'קפה', 'sugar': 'סוכר',
  'bamba': 'במבה', 'water': 'מים', 'toilet paper': 'נייר טואלט', 'dish soap': 'סבון כלים', 'laundry powder': 'אבקת כביסה', 'laundry detergent': 'אבקת כביסה',
  'detergent': 'אבקת כביסה', 'trash bags': 'שקיות אשפה', 'garbage bags': 'שקיות אשפה', 'carrot': 'גזר', 'carrots': 'גזר', 'pepper': 'פלפל', 'peppers': 'פלפל',
  'lettuce': 'חסה', 'lemon': 'לימון', 'lemons': 'לימון', 'avocado': 'אבוקדו', 'orange': 'תפוזים', 'oranges': 'תפוזים', 'garlic': 'שום', 'broccoli': 'ברוקולי',
  'mushroom': 'פטריות', 'mushrooms': 'פטריות', 'chicken': 'עוף', 'chicken breast': 'חזה עוף', 'ground meat': 'בשר טחון', 'minced meat': 'בשר טחון', 'schnitzel': 'שניצל',
  'fish': 'דג', 'tuna': 'טונה', 'salmon': 'סלמון', 'chocolate milk': 'שוקו', 'flour': 'קמח', 'salt': 'מלח', 'couscous': 'פתיתים', 'hummus': 'חומוס', 'tahini': 'טחינה',
  'honey': 'דבש', 'jam': 'ריבה', 'cornflakes': 'קורנפלקס', 'corn flakes': 'קורנפלקס', 'cereal': 'דגני בוקר', 'chocolate': 'שוקולד', 'cookies': 'עוגיות', 'cookie': 'עוגיות',
  'bisli': 'ביסלי', 'cola': 'קולה', 'juice': 'מיץ', 'beer': 'בירה', 'wine': 'יין', 'tea': 'תה', 'ice cream': 'גלידה', 'pita': 'פיתה', 'challah': 'חלה', 'shampoo': 'שמפו',
  'toothpaste': 'משחת שיניים', 'soap': 'סבון', 'paper towels': 'מגבות נייר', 'paper towel': 'מגבות נייר', 'bleach': 'אקונומיקה', 'sponges': 'ספוגים', 'sponge': 'ספוג',
  'diapers': 'חיתולים', 'wet wipes': 'מגבונים', 'wipes': 'מגבונים', 'ketchup': 'קטשופ', 'mayonnaise': 'מיונז', 'mayo': 'מיונז', 'mustard': 'חרדל', 'beans': 'שעועית',
  'lentils': 'עדשים', 'corn': 'תירס', 'mint': 'נענע', 'parsley': 'פטרוזיליה', 'cilantro': 'כוסברה', 'eggplant': 'חציל', 'zucchini': 'קישואים', 'watermelon': 'אבטיח',
  'melon': 'מלון', 'grapes': 'ענבים', 'strawberries': 'תותים', 'nuts': 'אגוזים', 'almonds': 'שקדים', 'salami': 'נקניק', 'pastrami': 'פסטרמה'
};
function heName_(n) {
  const k = String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!/^[a-z' -]+$/.test(k)) return n;
  if (EN2HE[k]) return EN2HE[k];
  if (k.slice(-1) === 's' && EN2HE[k.slice(0, -1)]) return EN2HE[k.slice(0, -1)];
  return n;
}
/* שם של בן משפחה שהוקלד באנגלית נשמר בעברית (Tzipi ← ציפי), כדי שההודעות לקבוצה יהיו בעברית ובלשון הנכונה */
const NAMES_HE = { 'tzipi': 'ציפי', 'tsipi': 'ציפי', 'zipi': 'ציפי', 'cipi': 'ציפי', 'danny': 'דני', 'dani': 'דני', 'danni': 'דני' };
function heBy_(n) { const k = String(n || '').trim().toLowerCase(); return NAMES_HE[k] || n; }
function heQty_(q) { return String(q || '').replace(/\bkg\b/gi, 'ק״ג').replace(/\bpcs?\b/gi, 'יח׳'); }

function esc_(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* ---------------- הודעות אוטומטיות בוואטסאפ (Green API) ----------------
   הפרטים נשמרים בהגדרות הסקריפט ולא בקוד: ⚙️ "הגדרות הפרויקט" ← "מאפייני סקריפט" ← להוסיף:
     GREEN_URL    כתובת ה-apiUrl מהקונסולה, למשל https://7107.api.greenapi.com
     GREEN_ID     idInstance
     GREEN_TOKEN  apiTokenInstance  (סודי! לא לשלוח לאף אחד ולא לצלם עם העין פתוחה)
     GREEN_CHAT   (לא חובה) מזהה יעד: קבוצה (120363…@g.us) או מספר אישי (972501234567@c.us).
                  אם ריק, הסקריפט מוצא לבד את הקבוצה ששמה WA_GROUP (למטה) ושומר את המזהה שלה.
   לבדיקה: testWhatsapp. לרשימת הקבוצות: whatsappGroups. */
const WA_GROUP = 'SHOPPING LIST';
const SHOP_LINK = 'https://dannybd20-hue.github.io/akordim/go/shopping.html';
function waCfg_() {
  const p = PropertiesService.getScriptProperties();
  const c = { url: (p.getProperty('GREEN_URL') || '').replace(/\/+$/, ''), id: p.getProperty('GREEN_ID') || '', token: p.getProperty('GREEN_TOKEN') || '', chat: p.getProperty('GREEN_CHAT') || '' };
  return c.url && c.id && c.token ? c : null;
}
/* היעד: GREEN_CHAT אם הוגדר, אחרת הקבוצה ששמה WA_GROUP (מחפשים פעם אחת בלבד ושומרים) */
function waChat_(c) {
  if (c.chat) return c.chat;
  const res = UrlFetchApp.fetch(c.url + '/waInstance' + c.id + '/getContacts/' + c.token, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) { console.warn('getContacts ' + res.getResponseCode()); return ''; }
  const want = WA_GROUP.trim().toLowerCase();
  const g = JSON.parse(res.getContentText()).filter(function (x) { return /@g\.us$/.test(x.id) && String(x.name || '').trim().toLowerCase() === want; })[0];
  if (!g) { console.warn('לא נמצאה קבוצה בשם ' + WA_GROUP + ' (המספר המחובר צריך להיות חבר בה)'); return ''; }
  PropertiesService.getScriptProperties().setProperty('GREEN_CHAT', g.id);
  return g.id;
}
function waOn_() { return !!waCfg_(); }
function waSend_(text, to) {
  const c = waCfg_(); if (!c) return false;
  const chat = to || waChat_(c); if (!chat) return false;
  const res = UrlFetchApp.fetch(c.url + '/waInstance' + c.id + '/sendMessage/' + c.token, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chatId: chat, message: text })
  });
  if (res.getResponseCode() !== 200) { console.warn('whatsapp ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200)); return false; }
  return true;
}

/* entries: [{n: שם, q: כמות, k: 'add' | 'pantry' | 'auto'}]. נשלחת הודעה אחת לכל הקבוצה */
function notify_(entries, from, title) {
  if (!entries || !entries.length || !waOn_()) return null;
  try {
    const verb = FEMALE.indexOf(from) >= 0 ? 'הוסיפה' : 'הוסיף';
    const head = title || (from ? from + ' ' + verb + ' לרשימה' : entries.every(function (e) { return e.k === 'auto'; }) ? 'נוסף אוטומטית לרשימה' : 'נוסף לרשימת הקניות');
    const lines = entries.map(function (e) {
      const tag = e.k === 'pantry' ? ' 🏠 נגמר בבית' : e.k === 'auto' ? ' 🔁' : '';
      return '• ' + e.n + (e.q ? ' (' + e.q + ')' : '') + tag;
    });
    return waSend_('🛒 *קניות לבית*\n' + head + ':\n' + lines.join('\n') + '\n\nלרשימה המלאה: ' + SHOP_LINK) ? [1] : null;
  } catch (x) { console.warn('whatsapp: ' + x); }
}

/* סימנו "נקנה": הודעה אחת לקבוצה על כל מה שנקנה (גם בלי סימון "שלח בוואטסאפ") */
function notifyBought_(items, from) {
  if (!items || !items.length || !waOn_()) return;
  try {
    const verb = FEMALE.indexOf(from) >= 0 ? 'קנתה' : 'קנה';
    const head = from ? '✅ ' + from + ' ' + verb + ':' : '✅ נקנה:';
    waSend_('🛒 *קניות לבית*\n' + head + '\n' + items.map(function (e) { return '• ' + e.n + (e.q ? ' (' + e.q + ')' : ''); }).join('\n'));
  } catch (x) { console.warn('whatsapp bought: ' + x); }
}

/* ---------------- תזכורת שבועית וסיכום שבועי בוואטסאפ ----------------
   תזכורת: ביום REMIND_DAY בשעה REMIND_HOUR, אם יש פריטים ברשימה. סיכום: ביום SUMMARY_DAY בשעה SUMMARY_HOUR.
   הטריגרים נוצרים לבד (פעם ביום נבדק שהם קיימים), אין צורך להריץ כלום. ימים: 1 = ראשון … 5 = חמישי. */
const REMIND_DAY = 5, REMIND_HOUR = 17;
const SUMMARY_DAY = 1, SUMMARY_HOUR = 9;
const DAYS_ = [ScriptApp.WeekDay.SUNDAY, ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.TUESDAY, ScriptApp.WeekDay.WEDNESDAY, ScriptApp.WeekDay.THURSDAY, ScriptApp.WeekDay.FRIDAY, ScriptApp.WeekDay.SATURDAY];
function ensureReminders_() {
  try {
    const have = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
    if (have.indexOf('weeklyReminder') < 0) ScriptApp.newTrigger('weeklyReminder').timeBased().onWeekDay(DAYS_[REMIND_DAY - 1]).atHour(REMIND_HOUR).inTimezone('Asia/Jerusalem').create();
    if (have.indexOf('weeklySummary') < 0) ScriptApp.newTrigger('weeklySummary').timeBased().onWeekDay(DAYS_[SUMMARY_DAY - 1]).atHour(SUMMARY_HOUR).inTimezone('Asia/Jerusalem').create();
  } catch (x) { console.warn('triggers: ' + x); }
}
// אפשר להריץ מהעורך כדי ליצור את הטריגרים מיד (אחרת הם נוצרים לבד בלילה הקרוב)
function setupReminders() { ensureReminders_(); Logger.log('הטריגרים מוכנים: תזכורת ביום ' + REMIND_DAY + ' בשעה ' + REMIND_HOUR + ', סיכום ביום ' + SUMMARY_DAY + ' בשעה ' + SUMMARY_HOUR); }
function weeklyReminder() {
  if (!waOn_()) return;
  const items = load_().st.items;
  if (!items.length) return;
  const lines = items.slice(0, 12).map(function (x) { return '• ' + x.name + (x.qty ? ' (' + x.qty + ')' : ''); });
  waSend_('🛒 *קניות לבית*\n⏰ תזכורת: ברשימה עדיין ' + items.length + (items.length === 1 ? ' פריט' : ' פריטים') + ':\n' + lines.join('\n') + (items.length > 12 ? '\nועוד ' + (items.length - 12) + '…' : '') + '\n\nלרשימה המלאה: ' + SHOP_LINK);
}
function weeklySummary() {
  if (!waOn_()) return;
  const st = load_().st, since = Date.now() - 7 * 864e5;
  const log = (st.log || []).filter(function (e) { return e.t >= since; });
  if (!log.length) return;
  const by = {}, items = {};
  log.forEach(function (e) { const w = e.by || 'לא ידוע'; by[w] = (by[w] || 0) + 1; const k = shopKey(e.n); items[k] = items[k] || { n: e.n, c: 0 }; items[k].c++; });
  const people = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).map(function (w) { return '• ' + w + ': ' + by[w]; });
  const top = Object.keys(items).map(function (k) { return items[k]; }).sort(function (a, b) { return b.c - a.c; }).slice(0, 5)
    .map(function (x) { return x.n + (x.c > 1 ? ' ×' + x.c : ''); });
  waSend_('🛒 *קניות לבית*\n📊 סיכום השבוע: נקנו ' + log.length + (log.length === 1 ? ' פריט' : ' פריטים') + '\n' + people.join('\n') + '\n\nהכי הרבה: ' + top.join(', ') + (st.items.length ? '\nעדיין ברשימה: ' + st.items.length : '\nהרשימה ריקה 🎉'));
}

// מריצים מהעורך: מציג ביומן את כל הקבוצות של המספר המחובר, עם המזהה (id) שצריך להדביק ב-GREEN_CHAT
function whatsappGroups() {
  const p = PropertiesService.getScriptProperties();
  const url = (p.getProperty('GREEN_URL') || '').replace(/\/+$/, ''), id = p.getProperty('GREEN_ID'), token = p.getProperty('GREEN_TOKEN');
  if (!url || !id || !token) { Logger.log('חסר GREEN_URL / GREEN_ID / GREEN_TOKEN במאפייני הסקריפט'); return; }
  const res = UrlFetchApp.fetch(url + '/waInstance' + id + '/getContacts/' + token, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) { Logger.log('שגיאה ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300)); return; }
  const groups = JSON.parse(res.getContentText()).filter(function (c) { return /@g\.us$/.test(c.id); });
  Logger.log('קבוצות (' + groups.length + '):');
  groups.forEach(function (g) { Logger.log(g.name + '  ←  ' + g.id); });
  if (!groups.length) Logger.log('לא נמצאו קבוצות. שלח הודעה כלשהי בקבוצה מהטלפון ונסה שוב.');
}

// בדיקה: מריצים מהעורך, ומגיעה הודעה לדוגמה ל-GREEN_CHAT
function testWhatsapp() {
  Logger.log(waOn_() ? (waSend_('🛒 *קניות לבית*\nהודעת ניסיון: ההתראות האוטומטיות עובדות ✅') ? 'נשלח ✅' : 'לא נשלח, ראה אזהרה ביומן') : 'חסר אחד מהמאפיינים GREEN_URL / GREEN_ID / GREEN_TOKEN');
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

/* "מי מחובר עכשיו" בדף הבית: כל דף פתוח באתר שולח מזהה מכשיר אקראי, שם האפליקציה ופרטי מכשיר.
   לכולם מוחזר רק מספר המכשירים בכל אפליקציה. רשימה מפורטת מוחזרת רק עם ADMIN_PASSWORD. */
const PRESENCE_PAGES = ['home', 'chords', 'maaser', 'tromot', 'shopping', 'forms', 'game', 'meds'];
function presence_(d) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return out_({ ok: false, error: 'busy' });
  try {
    const c = CacheService.getScriptCache(), now = Date.now();
    let m = {};
    try { m = JSON.parse(c.get('presence') || '{}'); } catch (x) {}
    Object.keys(m).forEach(k => { if (now - m[k].t > 100000) delete m[k]; });
    const id = String(d.id || '').slice(0, 40);
    const cut = (v, n) => String(v || '').slice(0, n);
    if (id && PRESENCE_PAGES.indexOf(d.page) >= 0) {
      if (d.leave) delete m[id];
      else m[id] = { a: d.page, t: now, n: cut(d.n, 30), r: cut(d.r, 40), d: cut(d.d, 20), s: Number(d.s) || now };
    }
    c.put('presence', JSON.stringify(m), 600);
    const counts = {};
    Object.keys(m).forEach(k => { counts[m[k].a] = (counts[m[k].a] || 0) + 1; });
    const res = { ok: true, total: Object.keys(m).length, counts: counts };
    if (d.admin) {
      if (!isAdmin_(d.admin) && locked_('admin')) res.admin = 'locked';
      else if (!isAdmin_(d.admin)) { failed_('admin'); res.admin = 'password'; }
      else { passed_('admin'); res.list = Object.keys(m).map(k => ({ id: k, a: m[k].a, n: m[k].n, r: m[k].r, d: m[k].d, s: m[k].s })); }
    }
    return out_(res);
  } finally { lock.releaseLock(); }
}

function doGet() { return out_({ ok: true, app: 'shopping' }); }

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad' }); }
  if (d.by !== undefined) d.by = heBy_(d.by);
  if (d.app === 'presence') return presence_(d);
  if (d.app === 'maaser') return maaserPost_(d);
  if (d.app === 'meds') return medsPost_(d);
  if (!isAdmin_(d.password)) {
    if (locked_('shop')) return out_({ ok: false, error: 'locked' });
    if (d.password !== SHOP_PASSWORD && !(EN_PASSWORD && d.password === EN_PASSWORD)) { failed_('shop'); return out_({ ok: false, error: 'password' }); }
  }
  passed_('shop');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  const lines = [], bought = [];
  let st;
  try {
    const l = load_(), now = Date.now();
    st = l.st;
    let changed = false;
    (d.ops || []).forEach(function (o) {
      if (o.name !== undefined) o.name = heName_(o.name); // שם באנגלית נשמר בעברית
      if (o.by !== undefined) o.by = heBy_(o.by);
      if (o.qty !== undefined) o.qty = heQty_(o.qty);
      const bi = o.type === 'bought' ? shopFind(st.items, o.iid) : -1, bItem = bi >= 0 ? { n: st.items[bi].name, q: st.items[bi].qty } : null;
      const pending = o.type === 'notify' ? shopPending(st).map(function (x) { return { n: x.name, q: x.qty, k: x.src === 'pantry' ? 'pantry' : 'add' }; }) : [];
      const before = st.items.length;
      if (!shopApply(st, o, now)) return;
      changed = true;
      if (bItem) { // נקנה: נשלחת הודעה לקבוצה, ונרשם מי קנה (בשביל הסיכום השבועי)
        bought.push(bItem);
        (st.log = st.log || []).push({ n: bItem.n, q: bItem.q, by: d.by || '', t: now });
        if (st.log.length > 400) st.log.shift();
      }
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
  notifyBought_(bought, d.by);
  return out_(d.rev === st.rev ? { ok: true, rev: st.rev, wa: waOn_() } : { ok: true, rev: st.rev, state: st, wa: waOn_() });
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
  maaserHourly_();
  medsHourly_();
  if (new Date().getHours() === 3) ensureReminders_(); // פעם ביום: מוודא שיש טריגרים לתזכורת ולסיכום
}

/* ---------------- מעשר כספי ---------------- */
// היום לפי שעון ישראל: {y, m, d}
function ilToday_() {
  const p = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-M-d').split('-');
  return { y: +p[0], m: +p[1], d: +p[2] };
}
function maaserLoad_() {
  const it = DriveApp.getFilesByName(MAASER_FILE);
  if (!it.hasNext()) return { f: null, st: maaserSeed(ilToday_()), fresh: true };
  const f = it.next();
  return { f: f, st: JSON.parse(f.getBlob().getDataAsString('UTF-8')) };
}
function maaserSave_(f, st) {
  st.rev = (st.rev || 0) + 1;
  const body = JSON.stringify(st);
  if (f) f.setContent(body); else DriveApp.createFile(MAASER_FILE, body, MimeType.PLAIN_TEXT);
}
function maaserPost_(d) {
  if (!isAdmin_(d.password)) {
    if (locked_('maaser')) return out_({ ok: false, error: 'locked' });
    if (!MAASER_PASSWORD || d.password !== MAASER_PASSWORD) { failed_('maaser'); return out_({ ok: false, error: 'password' }); }
  }
  passed_('maaser');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let st;
  try {
    const l = maaserLoad_(), t = ilToday_();
    st = l.st;
    let changed = !!l.fresh;
    (d.ops || []).forEach(function (o) { if (maaserApply(st, o, t)) changed = true; });
    if (maaserAuto(st, t)) changed = true;
    if (changed) maaserSave_(l.f, st);
  } finally {
    lock.releaseLock();
  }
  return out_(d.rev === st.rev ? { ok: true, rev: st.rev } : { ok: true, rev: st.rev, state: st });
}
// התרומות הקבועות נרשמות גם אם אף אחד לא פתח את האפליקציה
function maaserHourly_() {
  const it = DriveApp.getFilesByName(MAASER_FILE);
  if (!it.hasNext()) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const f = it.next(), st = JSON.parse(f.getBlob().getDataAsString('UTF-8'));
    if (maaserAuto(st, ilToday_())) maaserSave_(f, st);
  } finally {
    lock.releaseLock();
  }
}

// מריצים פעם אחת מהעורך: מאשרים הרשאות, מגדירים בדיקה שעתית ושולחים התראת ניסיון
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'hourly') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('hourly').timeBased().everyHours(1).create();
  const l = load_();
  if (!l.f) save_(null, l.st);
  Logger.log('מוכן. התראות וואטסאפ אוטומטיות: ' + (waOn_() ? 'פעילות' : 'כבויות (חסרים מאפייני GREEN_…)'));
}

/* ---------------- ליבה משותפת לקניות (זהה ל-shop-core.js באתר) ---------------- */
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

/* ---------------- ליבה משותפת למעשר (זהה ל-maaser-core.js באתר) ---------------- */
/* ליבת אפליקציית המעשר. אותו קוד רץ גם בדף (maaser.html) וגם בסקריפט של גוגל,
   כך שכל שינוי מחושב באותה צורה בטלפון, במחשב ובענן.
   מבנה הנתונים:
     transactions - חיובי מעשר: {id, productName, buyPrice, sellPrice, profit, maaserPercent, maaserAmount, date, direct?}
     payments     - תשלומי מעשר: {id, recipient, amount, note, date, recurring?}
     recurring    - תרומות קבועות: {id, name, amount, day, active, last: 'YYYY-MM' = החודש האחרון שנרשם}
   t (היום) הוא {y, m, d} לפי שעון ישראל. */

function mzMonth(y, m) { return y + '-' + (m < 10 ? '0' : '') + m; }
function mzNext(k) { var y = +k.slice(0, 4), m = +k.slice(5) + 1; if (m > 12) { m = 1; y++; } return mzMonth(y, m); }
function mzPrev(k) { var y = +k.slice(0, 4), m = +k.slice(5) - 1; if (m < 1) { m = 12; y--; } return mzMonth(y, m); }
function mzFind(arr, id) { for (var i = 0; i < arr.length; i++) if (String(arr[i].id) === String(id)) return i; return -1; }
function mzDate(t) { return (t.d < 10 ? '0' : '') + t.d + '/' + (t.m < 10 ? '0' : '') + t.m + '/' + t.y; }
function maaserNew() { return { transactions: [], payments: [], recurring: [], rev: 0 }; }

/* נקודת ההתחלה: התרומות הקבועות, יתרת הפתיחה ועסקת המצלמות.
   החודש הנוכחי נחשב כבר "נרשם" אם היום כבר עבר, כדי לא לחייב פעמיים מה שכבר שולם */
function maaserSeed(t) {
  var st = maaserNew(), cur = mzMonth(t.y, t.m);
  st.recurring = [['הרב איתן', 2000], ['בית הכנסת המרכזי', 100], ['קהילת רמת בית שמש', 200], ['בית חב"ד', 200],
                  ['בית חב"ד (770)', 770], ['מלך עוזר', 200], ['תפארת יעקב', 200], ['שיחת השבוע', 195]]
    .map(function (x, i) { return { id: 'r' + (i + 1), name: x[0], amount: x[1], day: 10, active: true, last: t.d >= 10 ? cur : mzPrev(cur) }; });
  [['יתרת מעשר (פתיחה)', 7065], ['התקנת מצלמות', 160]].forEach(function (x, i) {
    st.transactions.push({ id: 's' + (i + 1), productName: x[0], buyPrice: 0, buyPriceNoVat: 0, sellPrice: 0, profit: 0,
                           maaserPercent: 0, maaserAmount: x[1], date: mzDate(t), direct: true });
  });
  return st;
}

/* רושם תרומה קבועה כתשלום לחודש k. המזהה קבוע לפי תרומה וחודש, כך שאי אפשר לרשום אותו חודש פעמיים */
function maaserPost(st, r, k) {
  var id = 'rp-' + r.id + '-' + k;
  if (mzFind(st.payments, id) < 0) {
    var y = +k.slice(0, 4), m = +k.slice(5);
    st.payments.push({ id: id, recipient: r.name, amount: r.amount, note: 'תרומה קבועה · חודש ' + k.slice(5) + '/' + y,
                       date: mzDate({ y: y, m: m, d: r.day }), recurring: r.id });
  }
  r.last = k;
}

/* רושם את כל החודשים שהגיע זמנם (גם חודשים שהוחמצו). מחזיר כמה נרשמו */
function maaserAuto(st, t) {
  var cur = mzMonth(t.y, t.m), n = 0;
  st.recurring.forEach(function (r) {
    if (!r.active) return;
    for (var k = mzNext(r.last); k <= cur; k = mzNext(k)) {
      if (k === cur && t.d < r.day) break;
      maaserPost(st, r, k);
      n++;
    }
  });
  return n;
}

/* מחיל פעולה אחת. מחזיר true אם משהו השתנה */
function maaserApply(st, o, t) {
  var i, r, cur = mzMonth(t.y, t.m);
  switch (o.type) {
    case 'txadd': if (mzFind(st.transactions, o.tx.id) >= 0) return false; st.transactions.push(o.tx); return true;
    case 'txdel': i = mzFind(st.transactions, o.id); if (i < 0) return false; st.transactions.splice(i, 1); return true;
    case 'payadd': if (mzFind(st.payments, o.pay.id) >= 0) return false; st.payments.push(o.pay); return true;
    case 'paydel': i = mzFind(st.payments, o.id); if (i < 0) return false; st.payments.splice(i, 1); return true;
    case 'recadd':
      if (mzFind(st.recurring, o.rec.id) >= 0) return false;
      o.rec.last = t.d >= o.rec.day ? cur : mzPrev(cur); // מתחיל מהמועד הבא
      st.recurring.push(o.rec);
      return true;
    case 'recedit':
      i = mzFind(st.recurring, o.id); if (i < 0) return false;
      ['name', 'amount', 'active', 'day'].forEach(function (f) { if (o[f] !== undefined) st.recurring[i][f] = o[f]; });
      return true;
    case 'recdel': i = mzFind(st.recurring, o.id); if (i < 0) return false; st.recurring.splice(i, 1); return true;
    case 'recnow': // לרשום עכשיו את החודש הנוכחי לכל מה שעוד לא נרשם
      r = st.recurring.filter(function (x) { return x.active && x.last < cur; });
      r.forEach(function (x) { maaserPost(st, x, cur); });
      return r.length > 0;
  }
  return false;
}

/* ---------------- תרופות בבית ----------------
   הנתונים בקובץ meds_data.json בדרייב, והתמונות בקבצים נפרדים (med_<id>.jpg).
   זיהוי תרופה מתמונה: צריך מפתח של Claude (console.anthropic.com) בתור מאפיין סקריפט ANTHROPIC_KEY.
   התראות תוקף: כל בוקר ב-8:00 נשלחת הודעת וואטסאפ (אותה הגדרה של GREEN_… כמו בקניות) שבוע לפני פקיעת תוקף וביום הפקיעה.
   היעד: הקבוצה של הקניות, או צ'אט אחר אם מגדירים מאפיין MEDS_CHAT (למשל 972501234567@c.us). */
const MEDS_PASSWORD = '';              // סיסמה נוספת לאפליקציה (ריק = רק הסיסמה הראשית)
const MEDS_FILE = 'meds_data.json';
const MEDS_MODEL = 'claude-sonnet-5-5';
const MEDS_LINK = 'https://dannybd20-hue.github.io/akordim/meds.html';
const MEDS_HOUR = 8;
const MEDS_LOCS = ['מטבח', 'שירותי הורים', 'שירותי ילדים'];

function medsLoad_() {
  const it = DriveApp.getFilesByName(MEDS_FILE);
  if (!it.hasNext()) return { f: null, st: { items: [], locs: MEDS_LOCS.slice(), rev: 0 } };
  const f = it.next();
  const st = JSON.parse(f.getBlob().getDataAsString('UTF-8'));
  if (!st.locs || !st.locs.length) st.locs = MEDS_LOCS.slice();
  return { f: f, st: st };
}
function medsSave_(f, st) {
  st.rev = (st.rev || 0) + 1;
  const body = JSON.stringify(st);
  if (f) f.setContent(body); else DriveApp.createFile(MEDS_FILE, body, MimeType.PLAIN_TEXT);
}
function medsDate_(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; }
function medsFmt_(ms) { const d = new Date(ms); return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2); }
/* תוקף אפקטיבי: התוקף שעל האריזה, או תאריך הפתיחה + תוקף אחרי פתיחה - המוקדם מביניהם */
function medsEff_(it) {
  let e = medsDate_(it.exp);
  const o = medsDate_(it.opened);
  if (o != null && it.aft && +it.aft.n > 0) {
    const d = new Date(o);
    if (it.aft.u === 'd') d.setUTCDate(d.getUTCDate() + Math.round(+it.aft.n));
    else d.setUTCMonth(d.getUTCMonth() + Math.round(+it.aft.n));
    if (e == null || d.getTime() < e) e = d.getTime();
  }
  return e;
}
function medsPost_(d) {
  if (!isAdmin_(d.password)) {
    if (locked_('meds')) return out_({ ok: false, error: 'locked' });
    if (!MEDS_PASSWORD || d.password !== MEDS_PASSWORD) { failed_('meds'); return out_({ ok: false, error: 'password' }); }
  }
  passed_('meds');
  if (d.op === 'identify') return medsIdentify_(d);
  if (d.op === 'photo') {
    try {
      const f = DriveApp.getFileById(String(d.ph));
      return out_({ ok: true, data: 'data:image/jpeg;base64,' + Utilities.base64Encode(f.getBlob().getBytes()) });
    } catch (x) { return out_({ ok: false, error: 'nophoto' }); }
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const l = medsLoad_(), st = l.st;
    let changed = !l.f;
    if (d.op === 'save' && d.item) {
      const it = d.item;
      it.id = String(it.id || Utilities.getUuid().slice(0, 8));
      if (d.photo && String(d.photo).length > 200) {
        const bytes = Utilities.base64Decode(String(d.photo).replace(/^data:image\/\w+;base64,/, ''));
        const blob = Utilities.newBlob(bytes, 'image/jpeg', 'med_' + it.id + '.jpg');
        const old = st.items.filter(function (x) { return x.id === it.id; })[0];
        if (old && old.ph) { try { DriveApp.getFileById(old.ph).setTrashed(true); } catch (x) {} }
        it.ph = DriveApp.createFile(blob).getId();
      }
      const i = st.items.findIndex(function (x) { return x.id === it.id; });
      if (i >= 0) { if (!it.ph) it.ph = st.items[i].ph; if (!it.th) it.th = st.items[i].th; it.n = (medsDate_(it.exp) === medsDate_(st.items[i].exp) && it.opened === st.items[i].opened) ? st.items[i].n : {}; st.items[i] = it; }
      else { it.at = Date.now(); it.n = {}; st.items.push(it); }
      changed = true;
    } else if (d.op === 'del') {
      const i = st.items.findIndex(function (x) { return x.id === String(d.id); });
      if (i >= 0) { if (st.items[i].ph) { try { DriveApp.getFileById(st.items[i].ph).setTrashed(true); } catch (x) {} } st.items.splice(i, 1); changed = true; }
    } else if (d.op === 'locs' && Array.isArray(d.locs)) {
      st.locs = d.locs.map(function (s) { return String(s).slice(0, 30); }).filter(String).slice(0, 40);
      changed = true;
    }
    if (changed) medsSave_(l.f, st);
    return out_({ ok: true, rev: st.rev, items: st.items, locs: st.locs, ai: !!PropertiesService.getScriptProperties().getProperty('ANTHROPIC_KEY'), item: d.item ? st.items.filter(function (x) { return x.id === d.item.id; })[0] : undefined });
  } finally { lock.releaseLock(); }
}

/* זיהוי תרופה מתמונת האריזה (Claude עם ראייה). מחזיר JSON עם שם בעברית ובאנגלית, הסבר קצר, סוג, כמות, תוקף */
function medsIdentify_(d) {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_KEY');
  if (!key) return out_({ ok: false, error: 'nokey' });
  const img = String(d.image || '').replace(/^data:image\/\w+;base64,/, '');
  if (img.length < 200) return out_({ ok: false, error: 'noimage' });
  const prompt = 'זו תמונה של אריזת תרופה או מוצר רפואי שיש בבית. קרא את הכיתוב באריזה והחזר JSON בלבד (בלי שום טקסט נוסף ובלי בלוק קוד) עם המפתחות:\n' +
    '"he": שם המוצר בעברית כפי שמקובל בישראל, כולל החוזק אם מופיע (למשל "אקמול 500 מ״ג"),\n' +
    '"en": שם המוצר באנגלית (למשל "Acamol 500 mg"),\n' +
    '"desc": עד שני משפטים בעברית: מהו החומר הפעיל, מה התרופה עושה ולמה משתמשים בה. מידע כללי בלבד,\n' +
    '"type": "pills" לטבליות/כמוסות/כדורים, "liquid" לנוזל/סירופ/טיפות/תרסיס, "cream" למשחה/קרם/ג׳ל, או "other",\n' +
    '"qty": מספר היחידות בחבילה אם מודפס (מספר), אחרת null,\n' +
    '"unit": יחידת הכמות בעברית ("טבליות", "כמוסות", "מ״ל", "גרם"), אחרת "",\n' +
    '"exp": תאריך התפוגה המודפס בפורמט YYYY-MM-DD (אם מודפס רק חודש ושנה, היום האחרון של החודש), ואם לא נראה בתמונה null,\n' +
    '"aft": אם כתוב תוקף אחרי פתיחה, אובייקט {"n": מספר, "u": "m" לחודשים או "d" לימים}, אחרת null,\n' +
    '"conf": "high" או "low" לפי הביטחון בזיהוי.\n' +
    'אם אינך בטוח במשהו, השאר null או "" ואל תמציא.';
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: MEDS_MODEL, max_tokens: 900, messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } },
      { type: 'text', text: prompt }] }] })
  });
  if (res.getResponseCode() !== 200) { console.warn('identify ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300)); return out_({ ok: false, error: 'ai' + res.getResponseCode() }); }
  try {
    const txt = JSON.parse(res.getContentText()).content.map(function (c) { return c.text || ''; }).join('');
    const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
    return out_({ ok: true, info: JSON.parse(txt.slice(a, b + 1)) });
  } catch (x) { return out_({ ok: false, error: 'parse' }); }
}

/* בדיקה יומית (נקראת מ-hourly): הודעה שבוע לפני פקיעת תוקף, וביום הפקיעה. כל התראה נשלחת פעם אחת לכל תאריך */
function medsHourly_() {
  const h = +Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'H');
  if (h !== MEDS_HOUR) return;
  medsDaily();
}
function medsDaily() {
  if (!waOn_()) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const l = medsLoad_(); if (!l.f) return;
    const t = ilToday_(), today = Date.UTC(t.y, t.m - 1, t.d), st = l.st;
    const week = [], now = [], low = [];
    st.items.forEach(function (it) {
      const e = medsEff_(it); it.n = it.n || {};
      const line = function () { return '• ' + (it.he || it.en || 'תרופה') + ' — ' + (it.loc || 'ללא מקום') + ' — ' + medsFmt_(e).split('-').reverse().join('/'); };
      if (e != null) {
        const days = Math.round((e - today) / 864e5), stamp = medsFmt_(e);
        if (days <= 0 && it.n.x !== stamp) { now.push(line()); it.n.x = stamp; it.n.w = stamp; }
        else if (days > 0 && days <= 7 && it.n.w !== stamp) { week.push(line()); it.n.w = stamp; }
      }
      if (it.low != null && it.low !== '' && it.qty != null && +it.qty <= +it.low && it.n.l !== String(it.qty)) { low.push('• ' + (it.he || it.en) + ' — נשארו ' + it.qty + ' ' + (it.unit || '')); it.n.l = String(it.qty); }
      if (it.low != null && it.qty != null && +it.qty > +it.low) delete it.n.l;
    });
    if (!week.length && !now.length && !low.length) return;
    let msg = '💊 *תרופות בבית*';
    if (now.length) msg += '\n\n❌ פג תוקף:\n' + now.join('\n');
    if (week.length) msg += '\n\n⚠️ יפוג תוקף בשבוע הקרוב:\n' + week.join('\n');
    if (low.length) msg += '\n\n📉 נגמר המלאי:\n' + low.join('\n');
    msg += '\n\nלאפליקציה: ' + MEDS_LINK;
    const chat = PropertiesService.getScriptProperties().getProperty('MEDS_CHAT');
    if (waSend_(msg, chat)) medsSave_(l.f, st);
  } finally { lock.releaseLock(); }
}
// לבדיקה מהעורך: מריצים ומקבלים הודעת ניסיון
function testMeds() { Logger.log(waOn_() ? (waSend_('💊 *תרופות בבית*\nהודעת ניסיון ✅', PropertiesService.getScriptProperties().getProperty('MEDS_CHAT')) ? 'נשלח ✅' : 'לא נשלח') : 'חסרים מאפייני GREEN_…'); }
