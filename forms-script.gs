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
        return { id: i, title: f.getTitle(), description: f.getDescription(), open: f.isAcceptingResponses() };
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

/* ================= יצירת בוחן: איחוד הצלה – ריענון נהיגה ובטיחות (לפי מצגות 2025 ו-2026) =================
   מריצים פעם אחת מהעורך: בוחרים למעלה את createHatzalahQuiz ולוחצים "הפעלה".
   נוצרים טופס בוחן בגוגל פורמס (עם התמונות והתשובות הנכונות) וגיליון תשובות מקושר,
   והטופס נוסף לאתר אוטומטית. הקישורים מופיעים ב"יומן ביצוע". */
const HATZALAH_QUIZ = {
  title: 'איחוד הצלה – בוחן ריענון נהיגה ובטיחות',
  description: 'בוחן לפי השתלמות הבטיחות השנתית 2026 ורענון הנהיגה המקצועי 2025 של מחלקת קציני הבטיחות. בהצלחה!',
  img: 'https://dannybd20-hue.github.io/akordim/brand/uh/',
  questions: [
    { q: 'האם לפי החוק רכב ביטחון מחויב להפעיל אורות מהבהבים וסירנה בכל נסיעת חירום?', img: 'q1.jpg',
      a: ['כן, ברור, אחרת הוא לא רכב ביטחון על פי החוק', 'כן, אבל מספיק שהוא ידליק רק רולרים, לא חייב סירנה', 'לא, מספיקים אורות מהבהבים', 'תלוי לאיזה מקרה הוא יוצא'], right: 0 },
    { q: 'אם קיבלתי דוח בנסיעה רגילה, מה עליי לעשות?', img: 'q2.jpg',
      a: ['לחתום על ההסבה ולשלם', 'לארגן מקרה קרוב שלא הייתי בו', 'מה אכפת לי, בעיה של הארגון', 'יש לי סבתא, נסב עליה'], right: 0 },
    { q: 'האם מותר לרכב פרטי להיכנס לצומת באור אדום לצורך פינוי הדרך לאמבולנס?', img: 'q3.jpg',
      a: ['כן, ברור, אחרת איך האמבולנס יעבור', 'כן, אבל חייב לעצור לפני הכניסה לצומת', 'אסור לו לעבור בכלל באור אדום', 'רק אם הוא משאית'], right: 2 },
    { q: 'הייתי מעורב בתאונה, נגרם נזק לרכב או שהרכב נגנב. מה עליי לעשות?', img: 'q4.jpg',
      a: ['לדווח לקצין הבטיחות בסוף החודש', 'לעדכן את המוקד 1221 באופן מיידי', 'אם אין נפגעים, לא צריך לדווח', 'לצלם ולשלוח לקבוצת הוואטסאפ של הסניף'], right: 1 },
    { q: 'בנסיעת חירום הגעתי לצומת ברמזור אדום. מה חובה לעשות?', img: 'q5.jpg',
      a: ['להאט ל-30 קמ״ש ולעבור', 'לצפור ולעבור, הסירנה נותנת זכות קדימה', 'לעצור עצירה מוחלטת לפני הכניסה לצומת', 'לעבור מהר כדי לצמצם את הזמן בצומת'], right: 2 },
    { q: 'אני מתקרב למעבר חציה ואין לי שדה ראייה לשני הצדדים. מה עליי לעשות?', img: 'q6.jpg',
      a: ['להמשיך במהירות, הסירנה מזהירה את הולכי הרגל', 'להאט ולהיות מוכן לעצירה', 'לעבור בנתיב הנגדי', 'לצפור פעמיים ולהמשיך'], right: 1 },
    { q: 'עמדתי ברמזור אדום, והאור התחלף לירוק. מה חובה לעשות לפני תחילת הנסיעה?', img: 'q7.jpg',
      a: ['לצאת מיד, ירוק זה ירוק', 'להסתכל לשמאל, ישר ולימין, כדי לשלול רכב שמחליט לעבור באדום', 'להסתכל רק במראה האחורית', 'לחכות 10 שניות'], right: 1 },
    { q: 'מתי מותר לעקוף רכבת קלה בנסיעת חירום?', img: 'q8.jpg',
      a: ['בכל מצב, כשהסירנה פועלת', 'כשהרכבת נוסעת לאט', 'אסור לעקוף רכבת קלה בתנועה; רק אחרי שהיא עצרה עצירה מלאה בתחנה', 'אף פעם, גם לא כשהיא עומדת בתחנה'], right: 2 },
    { q: 'הרכבת הקלה עצרה בתחנה ואני רוצה לעקוף אותה. מה חובה לעשות?', img: 'q9.jpg',
      a: ['לעצור עצירה מוחלטת בקו הקרון הראשון, לוודא שאין רכב או רכבת ממול ולשמור על ערנות להולכי רגל', 'לעקוף מהר לפני שהרכבת תמשיך', 'להדליק אורות גבוהים ולעקוף', 'לעקוף רק מצד ימין'], right: 0 },
    { q: 'מה חובה לעשות בעת נסיעה לאחור?', img: 'q10.jpg',
      a: ['מספיק להסתכל במצלמת הרוורס', 'להסתייע במכוון, לפתוח חלונות ולוודא שהמצלמה וחיישני הרוורס תקינים', 'לצפור ולנסוע לאט', 'אין כללים מיוחדים, רק להיזהר'], right: 1 },
    { q: 'מהו "שול הדרך" לפי ההגדרה?', a: ['כל השטח שבצד הכביש, בלי הגבלה', 'השטח שאין לצדו מדרכה, הסמוך לשפת הכביש, עד רוחב של 4 מטרים', 'הנתיב הימני של הכביש', 'השטח שבין שני קווי הפרדה'], right: 1 },
    { q: 'מה המהירות המותרת בנסיעה בשול בזמן חירום?', a: ['עד 20 קמ״ש מעל מהירות התנועה הכללית, ולא יותר מ-50 קמ״ש', 'עד 90 קמ״ש', 'כמו מהירות התנועה בנתיב', 'אין הגבלה כשהסירנה פועלת'], right: 0 },
    { q: 'מעבר החצייה ריק או שיש הולך רגל בקרבתו. באיזו מהירות מותר לעבור אותו?', a: ['עד 30 קמ״ש', 'עד 50 קמ״ש', 'עד 15 קמ״ש', 'כל מהירות, אם הסירנה פועלת'], right: 2 },
    { q: 'רכב תאגיד ביצע עבירת תנועה. מה קורה לדוח?', a: ['הדוח מבוטל אוטומטית', 'הדוח מוכפל פי 4 מהסכום המקורי, וללא נקודות', 'הדוח זהה לדוח רגיל', 'הנהג מקבל נקודות כפולות'], right: 1 },
    { q: 'בנסיעת חירום אני עובר לנתיב פנוי (ריק). מה עליי לעשות?', a: ['לעבור מהר, הנתיב ממילא ריק', 'לעצור עצירה מלאה ולוודא שהנתיב פנוי', 'לצפור ולעבור', 'להאט ל-40 קמ״ש'], right: 1 },
    { q: 'באיזה מרחק לפחות חייב רכב רגיל לנסוע אחרי רכב ביטחון?', a: ['20 מטר', '50 מטר', '100 מטר', 'אין חובה'], right: 2 },
    { q: 'לפי תקנה 94, מתי רשאי נוהג רכב ביטחון לעבור רמזור אדום בלי לעצור?', a: ['תמיד, בשעת מילוי תפקידו', 'בשעת מילוי תפקידו, ובלבד שהאט במידה שהבטיחות מחייבת', 'רק בלילה', 'אף פעם'], right: 1 },
    { q: 'מהו הגורם העיקרי לתאונות בארגון?', a: ['תקלות ברכב', 'עייפות, טלפון וחוסר תשומת לב', 'מזג אוויר', 'כבישים משובשים'], right: 1 },
    { q: 'הייתי מעורב בתאונה. מה חשוב לעשות לפני שמזיזים את כלי הרכב?', a: ['לצלם גם בווידאו את זירת התאונה מכל הכיוונים', 'להזיז מיד את הרכבים לשול', 'לחכות למשטרה בלי לצלם', 'לעזוב את המקום ולדווח אחר כך'], right: 0 },
    { q: 'מותר להעביר את צ׳יפ הנהיגה האישי שלי לנהג אחר?', a: ['כן, אם הוא מתנדב בארגון', 'כן, במשמרת לילה', 'לא. הצ׳יפ אישי, ושימוש של נהג אחר עלול לרשום על שמי דוחות', 'כן, אם קיבלתי אישור מחבר'], right: 2 },
    { q: 'מותר להפעיל כריזה ואורות מהבהבים ולצאת לקריאה ששמעתי עליה, בלי הזנקה מהמוקד?', a: ['כן, אם זה קרוב אליי', 'כן, אם זה מקרה קשה', 'חל איסור מוחלט, רק לפי הזנקה ממוקד איחוד הצלה', 'כן, אחרי שמודיעים לחבר'], right: 2 },
    { q: 'מותר לפנות מטופל ברכב ארגוני שאינו אמבולנס או רכב פינוי?', a: ['כן, אם המקרה דחוף', 'חל איסור על פינוי נפגעים או מטופלים ברכב כזה', 'כן, אם המטופל מסכים', 'כן, בתוך העיר בלבד'], right: 1 },
    { q: 'השלם את כלל הברזל: "אם יש ספק…"', img: 'q11.jpg',
      a: ['…אז נוסעים מהר', '…שואלים את המוקד', '…אין ספק!', '…ממשיכים כרגיל'], right: 2 },
    { q: 'לפי כללי הברזל, מהי המטרה הראשונה?', img: '',
      a: ['להגיע ראשון לאירוע', 'לחזור הביתה לשלום', 'לחסוך בזמן', 'לא לקבל דוחות'], right: 1 },
    { q: 'השלם את כלל הברזל: "תאונות לא קורות…"', img: '',
      a: ['…הן נגרמות!', '…בלילה', '…לנהגים ותיקים', '…בנסיעת חירום'], right: 0 },
  ]
};

function createHatzalahQuiz() { createQuiz_(HATZALAH_QUIZ); }



function createQuiz_(def) {
  const form = FormApp.create(def.title);
  form.setDescription(def.description).setIsQuiz(true).setCollectEmail(false).setShuffleQuestions(false);
  def.questions.forEach(function (d) {
    if (d.img) {
      try { form.addImageItem().setImage(UrlFetchApp.fetch(def.img + d.img).getBlob()); }
      catch (x) { Logger.log('לא נטענה תמונה ' + d.img + ': ' + x); }
    }
    const q = form.addMultipleChoiceItem().setTitle(d.q).setRequired(true).setPoints(1);
    q.setChoices(d.a.map(function (t, i) { return q.createChoice(t, i === d.right); }));
  });
  const ss = SpreadsheetApp.create(def.title + ' (תשובות)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  const props = PropertiesService.getScriptProperties();
  let extra = [];
  try { extra = JSON.parse(props.getProperty('EXTRA_FORMS') || '[]'); } catch (x) {}
  extra.push(form.getEditUrl());
  props.setProperty('EXTRA_FORMS', JSON.stringify(extra));
  Logger.log('נוצר הבוחן: ' + form.getEditUrl());
  Logger.log('קישור למילוי בגוגל: ' + form.getPublishedUrl());
  Logger.log('גיליון התשובות: ' + ss.getUrl());
}
