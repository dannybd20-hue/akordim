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
  if (locked_()) return out_({ ok: false, error: 'locked' });
  const admin = d.password === ADMIN_PASSWORD;
  if (!admin && d.password !== FILL_PASSWORD) { failed_(); return out_({ ok: false, error: 'password' }); }
  try {
    if (d.action === 'list') return out_({ ok: true, admin: admin, forms: listForms_(admin) });
    if (d.action === 'form') return out_({ ok: true, form: formDef_(openForm_(d.id)) });
    if (d.action === 'submit') return out_(submit_(openForm_(d.id), d.answers || {}));
    if (d.action === 'results') {
      if (!admin) return out_({ ok: false, error: 'password' });
      return out_({ ok: true, results: results_(openForm_(d.id)) });
    }
    return out_({ ok: false, error: 'unknown action' });
  } catch (x) {
    return out_({ ok: false, error: String(x && x.message || x) });
  }
}

/* רק טפסים שברשימת FORMS; המזהה שהאתר שולח הוא המיקום ברשימה */
function openForm_(id) {
  const url = FORMS[Number(id)];
  if (!url) throw new Error('טופס לא קיים');
  return FormApp.openByUrl(url);
}

function listForms_(admin) {
  return FORMS.map(function (url, i) {
    try {
      const f = FormApp.openByUrl(url);
      const o = { id: i, title: f.getTitle(), description: f.getDescription(), open: f.isAcceptingResponses() };
      if (admin) o.count = f.getResponses().length;
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
    if (t === T.IMAGE || t === T.VIDEO) return;
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
  return { title: f.getTitle(), description: f.getDescription(), open: f.isAcceptingResponses(), items: items };
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
  return { ok: true };
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
