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

const PASSWORD = '1234'; // ← שנה לסיסמה משלך
const FOLDER_NAME = 'גיבוי תרומות בית כנסת';
const KEEP_DAYS = 60;

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false, error: 'bad request' }); }
  if (locked_('tromot')) return out({ ok: false, error: 'locked' });
  if (String(req.password || '').trim() !== PASSWORD) { failed_('tromot'); return out({ ok: false, error: 'password' }); }
  passed_('tromot');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
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

function doGet() {
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
