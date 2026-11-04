/**
 * סקריפט לטופס "בדיקת תקינות כלי" (bdika.html).
 * כל בדיקה שנהג שולח נכנסת כשורה בגיליון גוגל "בדיקות תקינות כלים" בדרייב שלך.
 *
 * התקנה (פעם אחת, עדיף מהמחשב):
 *  1. https://script.google.com ← "פרויקט חדש". מחק הכול והדבק את הקוד הזה.
 *  2. מלא למטה את ADMIN_PASSWORD (הסיסמה לקריאת הבדיקות מאפליקציית הניהול).
 *  3. "פריסה" ← "פריסה חדשה" ← סוג: "אפליקציית אינטרנט". "הפעלה בתור": אני. "למי יש גישה": כל אחד.
 *     "פריסה" ואישור ההרשאות.
 *  4. שלח את כתובת האפליקציה (https://script.google.com/macros/s/.../exec) כדי לחבר אותה לטופס.
 *  הגיליון נוצר לבד בבדיקה הראשונה, ותמצא אותו בדרייב בשם "בדיקות תקינות כלים".
 * עדכון קוד: "פריסה" ← "ניהול פריסות" ← ✏️ ← "גרסה חדשה" ← "פריסה".
 */

const ADMIN_PASSWORD = 'כתוב-כאן-סיסמה';
const SHEET_NAME = 'בדיקות תקינות כלים';
const HEAD = ['תאריך ושעה', 'שם', 'פרייבט', 'מספר כלי', 'סוג כלי', 'קילומטראז\'', 'תקלה שמונעת נסיעה', 'תקין', 'לא תקין', 'אחר', 'תקלה כללית', 'פירוט מלא'];

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sheet_() {
  const p = PropertiesService.getScriptProperties();
  let id = p.getProperty('sheet'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    p.setProperty('sheet', ss.getId());
    const sh = ss.getSheets()[0];
    sh.setName('בדיקות'); sh.appendRow(HEAD); sh.setFrozenRows(1); sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#1f4f8f').setFontColor('#ffffff');
  }
  return ss.getSheets()[0];
}
const clip_ = s => String(s == null ? '' : s).slice(0, 2000);

function doGet() { return out_({ ok: true, app: 'bdika' }); }

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad' }); }
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = sheet_();
    if (d.action === 'list') {
      if (ADMIN_PASSWORD.indexOf('כתוב-כאן') === 0 || d.password !== ADMIN_PASSWORD) return out_({ ok: false, error: 'pw' });
      const v = sh.getDataRange().getDisplayValues();
      return out_({ ok: true, head: v[0], rows: v.slice(1).slice(-500) });
    }
    const r = d.r || {};
    if (!r.num || !r.name) return out_({ ok: false, error: 'missing' });
    sh.appendRow([new Date(), clip_(r.name), clip_(r.priv), clip_(r.num), clip_(r.type), clip_(r.km),
      r.stop ? 'כן' : 'לא', clip_(r.ok), clip_(r.bad), clip_(r.other), clip_(r.general), clip_(r.text)]);
    if (r.stop) sh.getRange(sh.getLastRow(), 1, 1, HEAD.length).setBackground('#fbe9e9');
    return out_({ ok: true });
  } finally { lock.releaseLock(); }
}
