/**
 * סקריפט לאפליקציית "טפסים" באתר.
 *
 * האפליקציה מציגה את טפסי גוגל שלך בעיצוב של האתר. כל תשובה נשלחת דרך גוגל פורמס עצמו,
 * ולכן נכנסת לגיליון התשובות המקושר בדיוק כמו תשובה רגילה. מסך התוצאות (רק עם ADMIN_PASSWORD)
 * מושך את התשובות מהטופס ומתעדכן כל כמה שניות.
 *
 * התקנה (פעם אחת, עדיף מהמחשב):
 *  1. https://script.google.com ← "פרויקט חדש". מחק הכול והדבק את הקוד הזה.
 *  2. מלא למטה: FILL_PASSWORD, ADMIN_PASSWORD, ואת הקישורים לטפסים ב-FORMS.
 *     הקישור הוא כתובת העריכה של הטופס (https://docs.google.com/forms/d/.../edit).
 *  3. "פריסה" ← "פריסה חדשה" ← סוג: "אפליקציית אינטרנט". "הפעלה בתור": אני. "למי יש גישה": כל אחד.
 *     "פריסה" ואישור ההרשאות.
 *  4. שלח את כתובת האפליקציה (https://script.google.com/macros/s/.../exec) כדי לחבר אותה לאתר.
 * עדכון קוד: "פריסה" ← "ניהול פריסות" ← ✏️ ← "גרסה חדשה" ← "פריסה".
 */

const FILL_PASSWORD = 'כתוב-כאן-סיסמה-למילוי';      // מי שמזין אותה יכול למלא טפסים
const ADMIN_PASSWORD = 'כתוב-כאן-את-הסיסמה-הראשית'; // מי שמזין אותה רואה גם את התשובות
const FORMS = [
  // 'https://docs.google.com/forms/d/XXXXXXXX/edit',
];

const MAX_FAILS = 5, LOCK_MINUTES = 15;
/* סיסמת המנהל (ADMIN_PASSWORD) תמיד מתקבלת, וגם מבטלת חסימה של "יותר מדי ניסיונות שגויים" */
function isAdmin_(p) { return typeof ADMIN_PASSWORD === 'string' && ADMIN_PASSWORD.indexOf('כתוב-כאן') !== 0 && p === ADMIN_PASSWORD; }
function locked_() { return Number(CacheService.getScriptCache().get('fails') || 0) >= MAX_FAILS; }
function failed_() {
  const c = CacheService.getScriptCache();
  c.put('fails', String(Number(c.get('fails') || 0) + 1), LOCK_MINUTES * 60);
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return out_({ ok: true, app: 'forms' }); }

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad' }); }
  const admin = isAdmin_(d.password);
  if (admin) CacheService.getScriptCache().remove('fails'); // סיסמת מנהל מבטלת חסימה
  else {
    if (locked_()) return out_({ ok: false, error: 'locked' });
    if (d.password !== FILL_PASSWORD) { failed_(); return out_({ ok: false, error: 'password' }); }
  }
  try {
    if (d.action === 'list') return out_({ ok: true, admin: admin, forms: listForms_(admin) });
    if (d.action === 'form') return out_({ ok: true, form: cached_('def_' + Number(d.id), CACHE_SECONDS, function () { return formDef_(openForm_(d.id)); }) });
    if (d.action === 'submit') { const r = submit_(openForm_(d.id), d.answers || {}); CacheService.getScriptCache().remove('count_' + Number(d.id)); return out_(r); }
    if (d.action === 'results') {
      if (!admin) return out_({ ok: false, error: 'password' });
      return out_({ ok: true, results: results_(openForm_(d.id)) });
    }
    return out_({ ok: false, error: 'unknown action' });
  } catch (x) {
    return out_({ ok: false, error: String(x && x.message || x) });
  }
}

/* הטפסים באתר: רשימת FORMS, ואחריה טפסים שנוצרו בפונקציות היצירה למטה (נשמרים בהגדרות הסקריפט) */
function allForms_() {
  let extra = [];
  try { extra = JSON.parse(PropertiesService.getScriptProperties().getProperty('EXTRA_FORMS') || '[]'); } catch (x) {}
  return FORMS.concat(extra.filter(function (u) { return FORMS.indexOf(u) < 0; }));
}
/* רק טפסים שברשימה; המזהה שהאתר שולח הוא המיקום ברשימה */
function openForm_(id) {
  const url = allForms_()[Number(id)];
  if (!url) throw new Error('טופס לא קיים');
  return FormApp.openByUrl(url);
}

/* זיכרון קצר בגוגל, כדי שלא לפתוח את הטפסים מחדש בכל בקשה (פתיחת טופס לוקחת כמה שניות).
   שינוי בטופס עצמו יופיע באתר תוך עד 5 דקות; מספר התשובות מתעדכן כל דקה. */
const CACHE_SECONDS = 300, COUNT_SECONDS = 60;
function cached_(key, seconds, make) {
  const c = CacheService.getScriptCache(), v = c.get(key);
  if (v) return JSON.parse(v);
  const o = make();
  try { c.put(key, JSON.stringify(o), seconds); } catch (x) {} // ערך גדול מדי לזיכרון: פשוט לא נשמר
  return o;
}

function listForms_(admin) {
  return allForms_().map(function (url, i) {
    try {
      const o = cached_('info_' + i, CACHE_SECONDS, function () {
        const f = FormApp.openByUrl(url);
        return { id: i, title: f.getTitle(), description: f.getDescription(), open: f.isAcceptingResponses(), quiz: f.isQuiz() };
      });
      if (admin) o.count = cached_('count_' + i, COUNT_SECONDS, function () { return FormApp.openByUrl(url).getResponses().length; });
      return o;
    } catch (x) { return { id: i, title: 'טופס ' + (i + 1), error: 'אין גישה לטופס' }; }
  });
}

/* מבנה הטופס: שאלות, סוגים ואפשרויות, כדי שהאתר יציג אותו בעיצוב שלו */
function formDef_(f) {
  const T = FormApp.ItemType, items = [];
  f.getItems().forEach(function (it) {
    const t = it.getType(), o = { id: it.getId(), title: it.getTitle(), help: it.getHelpText() };
    if (t === T.SECTION_HEADER || t === T.PAGE_BREAK) { o.type = 'section'; items.push(o); return; }
    if (t === T.IMAGE) {
      /* תמונה בטופס: נשלחת לאתר כתמונה מוטמעת, ומוצגת מעל השאלה שאחריה */
      const b = it.asImageItem().getImage();
      o.type = 'image'; o.src = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
      items.push(o); return;
    }
    if (t === T.VIDEO) return;
    let q;
    if (t === T.TEXT) { q = it.asTextItem(); o.type = 'text'; }
    else if (t === T.PARAGRAPH_TEXT) { q = it.asParagraphTextItem(); o.type = 'paragraph'; }
    else if (t === T.MULTIPLE_CHOICE) { q = it.asMultipleChoiceItem(); o.type = 'radio'; o.choices = q.getChoices().map(c => c.getValue()); o.other = q.hasOtherOption(); }
    else if (t === T.CHECKBOX) { q = it.asCheckboxItem(); o.type = 'checkbox'; o.choices = q.getChoices().map(c => c.getValue()); o.other = q.hasOtherOption(); }
    else if (t === T.LIST) { q = it.asListItem(); o.type = 'select'; o.choices = q.getChoices().map(c => c.getValue()); }
    else if (t === T.SCALE) { q = it.asScaleItem(); o.type = 'scale'; o.min = q.getLowerBound(); o.max = q.getUpperBound(); o.minLabel = q.getLeftLabel(); o.maxLabel = q.getRightLabel(); }
    else if (t === T.DATE) { q = it.asDateItem(); o.type = 'date'; }
    else if (t === T.TIME) { q = it.asTimeItem(); o.type = 'time'; }
    else if (t === T.GRID) { q = it.asGridItem(); o.type = 'grid'; o.rows = q.getRows(); o.cols = q.getColumns(); }
    else if (t === T.CHECKBOX_GRID) { q = it.asCheckboxGridItem(); o.type = 'cgrid'; o.rows = q.getRows(); o.cols = q.getColumns(); }
    else if (t === T.RATING) { q = it.asRatingItem(); o.type = 'scale'; o.min = 1; o.max = q.getRatingScaleLevel(); }
    else return; // סוגים שלא נתמכים (למשל העלאת קובץ) לא מוצגים
    o.required = q.isRequired();
    items.push(o);
  });
  return { title: f.getTitle(), description: f.getDescription(), open: f.isAcceptingResponses(), quiz: f.isQuiz(), items: items };
}

/* שליחת תשובה דרך הטופס עצמו, כך שהיא נכנסת לגיליון המקושר */
function submit_(f, answers) {
  if (!f.isAcceptingResponses()) return { ok: false, error: 'הטופס סגור לתשובות' };
  const T = FormApp.ItemType, r = f.createResponse();
  f.getItems().forEach(function (it) {
    const v = answers[it.getId()], t = it.getType();
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return;
    if (t === T.TEXT) r.withItemResponse(it.asTextItem().createResponse(String(v)));
    else if (t === T.PARAGRAPH_TEXT) r.withItemResponse(it.asParagraphTextItem().createResponse(String(v)));
    else if (t === T.MULTIPLE_CHOICE) r.withItemResponse(it.asMultipleChoiceItem().createResponse(String(v)));
    else if (t === T.CHECKBOX) r.withItemResponse(it.asCheckboxItem().createResponse([].concat(v).map(String)));
    else if (t === T.LIST) r.withItemResponse(it.asListItem().createResponse(String(v)));
    else if (t === T.SCALE) r.withItemResponse(it.asScaleItem().createResponse(Number(v)));
    else if (t === T.RATING) r.withItemResponse(it.asRatingItem().createResponse(Number(v)));
    else if (t === T.DATE) { const p = String(v).split('-'); r.withItemResponse(it.asDateItem().createResponse(new Date(+p[0], +p[1] - 1, +p[2]))); }
    else if (t === T.TIME) { const p = String(v).split(':'); r.withItemResponse(it.asTimeItem().createResponse(+p[0], +p[1])); }
    else if (t === T.GRID) r.withItemResponse(it.asGridItem().createResponse(v));
    else if (t === T.CHECKBOX_GRID) r.withItemResponse(it.asCheckboxGridItem().createResponse(v));
  });
  r.submit();
  return f.isQuiz() ? { ok: true, quiz: grade_(f, answers) } : { ok: true };
}

/* בוחן: לכל שאלת בחירה, האם ענו נכון ומה התשובה הנכונה (נשלח רק אחרי השליחה) */
function grade_(f, answers) {
  const T = FormApp.ItemType, out = [];
  let score = 0, total = 0;
  f.getItems().forEach(function (it) {
    const t = it.getType();
    let q = null;
    if (t === T.MULTIPLE_CHOICE) q = it.asMultipleChoiceItem();
    else if (t === T.CHECKBOX) q = it.asCheckboxItem();
    else if (t === T.LIST) q = it.asListItem();
    if (!q) return;
    const right = q.getChoices().filter(function (c) { return c.isCorrectAnswer(); }).map(function (c) { return c.getValue(); });
    if (!right.length) return;
    const pts = q.getPoints() || 1, given = [].concat(answers[it.getId()] || []).map(String);
    const ok = given.length === right.length && right.every(function (v) { return given.indexOf(v) >= 0; });
    total += pts; if (ok) score += pts;
    out.push({ id: it.getId(), ok: ok, right: right });
  });
  return { score: score, total: total, items: out };
}

/* כל התשובות: לכל תשובה זמן, ולכל שאלה הערך כטקסט */
function results_(f) {
  const rs = f.getResponses();
  return rs.slice(-1000).map(function (r) {
    const a = {};
    r.getItemResponses().forEach(function (ir) {
      const v = ir.getResponse();
      a[ir.getItem().getId()] = Array.isArray(v) ? v.map(x => Array.isArray(x) ? (x || []).join(', ') : (x == null ? '' : String(x))) : String(v);
    });
    return { t: r.getTimestamp().getTime(), email: r.getRespondentEmail() || '', a: a };
  });
}

/* מחיקת טופס הבוחן של איחוד הצלה, אם נוצר בעבר בגרסה קודמת: הטופס והגיליון שלו עוברים לאשפה,
   והוא יורד מאפליקציית הטפסים. מריצים פעם אחת מהעורך: deleteHatzalahQuizForm ← "הפעלה". */
function deleteHatzalahQuizForm() {
  const props = PropertiesService.getScriptProperties();
  let extra = [];
  try { extra = JSON.parse(props.getProperty('EXTRA_FORMS') || '[]'); } catch (x) {}
  const keep = [];
  extra.forEach(function (u) {
    try {
      const f = FormApp.openByUrl(u);
      if (f.getTitle().indexOf('איחוד הצלה') !== 0) { keep.push(u); return; }
      try { DriveApp.getFileById(f.getDestinationId()).setTrashed(true); } catch (x) {}
      DriveApp.getFileById(f.getId()).setTrashed(true);
      Logger.log('הועבר לאשפה: ' + f.getTitle());
    } catch (x) { Logger.log('דילוג על ' + u + ': ' + x); }
  });
  props.setProperty('EXTRA_FORMS', JSON.stringify(keep));
  const c = CacheService.getScriptCache();
  for (let k = 0; k < 12; k++) { c.remove('info_' + k); c.remove('count_' + k); c.remove('def_' + k); }
  Logger.log('סיום. טפסים שנשארו מעבר לרשימה הקבועה: ' + keep.length);
}
