/**
 * סקריפט "משחק חי" (בסגנון קהוט) לאתר – פרויקט נפרד, בלי קשר לטפסים.
 *
 * המארח (עם ADMIN_PASSWORD) פותח משחק ומקבל קוד בן 6 ספרות וברקוד.
 * השחקנים נכנסים מהטלפון עם הקוד ושם בלבד, ועונים בכפתורים צבעוניים.
 * ניקוד: תשובה נכונה = עד 1000 נקודות לפי מהירות. התשובה הנכונה לא נשלחת לשחקנים לפני החשיפה.
 *
 * התקנה (פעם אחת, עדיף מהמחשב):
 *  1. https://script.google.com ← "פרויקט חדש". מחק הכול והדבק את הקוד הזה.
 *  2. "פריסה" ← "פריסה חדשה" ← סוג: "אפליקציית אינטרנט". "הפעלה בתור": אני. "למי יש גישה": כל אחד.
 *     "פריסה" ואישור ההרשאות.
 *  3. שלח את כתובת האפליקציה (https://script.google.com/macros/s/.../exec) כדי לחבר אותה לאתר.
 * עדכון קוד (למשל שאלות חדשות): "פריסה" ← "ניהול פריסות" ← ✏️ ← "גרסה חדשה" ← "פריסה".
 */

const ADMIN_PASSWORD = 'כתוב-כאן-את-הסיסמה-הראשית'; // רק עם הסיסמה הזו אפשר לפתוח ולנהל משחק

/* חסימה נגד ניחוש: אחרי 5 סיסמאות מארח שגויות, נחסם ל-15 דקות */
const MAX_FAILS = 5, LOCK_MINUTES = 15;
/* סיסמת המנהל (ADMIN_PASSWORD) תמיד מתקבלת, וגם מבטלת חסימה של "יותר מדי ניסיונות שגויים" */
function isAdmin_(p) { return typeof ADMIN_PASSWORD === 'string' && ADMIN_PASSWORD.indexOf('כתוב-כאן') !== 0 && p === ADMIN_PASSWORD; }
function locked_() { return Number(CacheService.getScriptCache().get('fails') || 0) >= MAX_FAILS; }
function failed_() { const c = CacheService.getScriptCache(); c.put('fails', String(Number(c.get('fails') || 0) + 1), LOCK_MINUTES * 60); }

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
const VERSION = 22; // עולה בכל עדכון, כדי לוודא שהפריסה הפעילה היא החדשה (פותחים את כתובת ה-exec בדפדפן)
const CHANGE_SECONDS = 10; // ברירת מחדל: כמה שניות מהתשובה הראשונה שחקן יכול לשנות תשובה (המארח יכול לשנות במשחק)
function chs_(g) { const n = Number(g.chs); return n > 0 ? n : CHANGE_SECONDS; }
function doGet() { return out_({ ok: true, app: 'game', version: VERSION }); }

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad' }); }
  let admin = false;
  if (d.password) {
    admin = isAdmin_(d.password);
    if (admin) CacheService.getScriptCache().remove('fails'); // סיסמת מנהל מבטלת חסימה
    else {
      if (locked_()) return out_({ ok: false, error: 'locked' });
      failed_();
    }
  }
  try { return out_(game_(d, admin)); }
  catch (x) { return out_({ ok: false, error: String(x && x.message || x) }); }
}

/* ================= שאלות למשחק החי: איחוד הצלה – ריענון נהיגה ובטיחות (לפי מצגות 2025 ו-2026) =================
   השאלות נשמרות כאן בלבד (בלי טופס בגוגל). כדי להוסיף משחק חדש: מוסיפים הגדרה כזו ומכניסים אותה ל-GAMES למטה. */
const HATZALAH_QUIZ = {
  passCorrect: 10,       // מבחן: כמה תשובות נכונות צריך כדי לעבור (0 = בלי מבחן, משחק רגיל)
  retakeCount: 10,       // בחינה חוזרת: כמה שאלות אקראיות מתוך כל השאלות
  retakePassCorrect: 8,  // בחינה חוזרת: כמה נכונות צריך כדי לעבור (8 מתוך 10 = 80%)
  title: 'איחוד הצלה – בוחן ריענון נהיגה ובטיחות',
  description: 'בוחן לפי השתלמות הבטיחות השנתית 2026 ורענון הנהיגה המקצועי 2025 של מחלקת קציני הבטיחות. 38 שאלות, בהצלחה!',
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
    { q: 'מהי חובת הנהג כאשר הוא מגיע לצומת ברמזור אדום בנסיעה דחופה?', img: 'q16.jpg',
      a: ['לעצור עצירה מלאה בקו הצומת', 'האטה קלה בלבד, אם יש לי שדה ראייה', 'מעבר מיידי, אם הצומת נראה פנוי', 'סימון לנהגים אחרים עם אורות גבוהים'], right: 0 },
    { q: 'כיצד יש לנהוג במעבר חציה ללא שדה ראייה בנסיעה דחופה?', img: 'q17.jpg',
      a: ['להאט ולחצות כרגיל', 'לעצור לגמרי ולהתקדם בגלישה, במהירות של עד 5 קמ״ש', 'לעקוף את שדה הראייה מצידו השני', 'לצפור ולהמשיך באותה מהירות'], right: 1 },
    { q: 'עמדתי ברמזור אדום, והאור התחלף לירוק. מה חובה לעשות לפני תחילת הנסיעה?', img: 'q7.jpg',
      a: ['לצאת מיד, ירוק זה ירוק', 'להסתכל לשמאל, ישר ולימין, כדי לשלול רכב שמחליט לעבור באדום', 'להסתכל רק במראה האחורית', 'לחכות 10 שניות'], right: 1 },
    { q: 'האם מותר לבצע עקיפת רכבת קלה בירושלים בנסיעת חירום?', img: 'q27.jpg',
      a: ['רק באישור מוקד', 'אסור בשום אופן', 'רק רכבת שעצרה בתחנה', 'אין נוהל כזה בכלל'], right: 2 },
    { q: 'באיזו דרך מותר לי לנוע לאחור על פי נהלי הארגון?', img: 'q10.jpg',
      a: ['עד 20 קמ״ש', 'רק אם יש צורך בכך, ובזהירות המרבית עם חלון פתוח', 'חייב להוריד מכוון ולפתוח חלונות', 'רק אחרי ירידה מהכלי וביצוע סיבוב מסביב לכלי'], right: 1 },
    { q: 'מהו שול הדרך? והאם מותר לנוע בו בנסיעת חירום על פי החוק?', img: 'q12.jpg',
      a: ['השול הוא משמאל לקו הלבן, והחוק מתיר לנוע שם בזהירות', 'זה נקרא בכלל שוליים ולא שול, ולרכב ביטחון מותר לנוע איפה שהוא צריך', 'החלק הימני שמעבר לקו הצהוב בלבד, ואסור לנוע בו בנסיעת חירום על פי החוק', 'צד שמאל, איפה שהקו הלבן, וצריך לעבור שם בזהירות מרבית'], right: 2 },
    { q: 'לפי הנוהל, אם נאלצים לרדת לשול בזמן חירום, מה המהירות המרבית?',
      a: ['עד 20 קמ״ש מעל מהירות התנועה הכללית, ולא יותר מ-50 קמ״ש', 'עד 90 קמ״ש', 'כמו מהירות התנועה בנתיב', 'אין הגבלה כשהסירנה פועלת'], right: 0 },
    { q: 'מעבר החצייה ריק או שיש הולך רגל בקרבתו. באיזו מהירות מותר לעבור אותו?',
      a: ['עד 30 קמ״ש', 'עד 50 קמ״ש', 'עד 15 קמ״ש', 'כל מהירות, אם הסירנה פועלת'], right: 2 },
    { q: 'במקרה של נתיב פנוי בצומת, מה על הנהג לעשות בנסיעה דחופה?', img: 'q22.jpg',
      a: ['להפעיל סירנה מהירה ולנסוע', 'לעבור במהירות כדי לא לעכב', 'רק אם שדה הראייה שלו פתוח, אפשר להאט ולעבור בזהירות', 'לעצור שוב ולסרוק את הנתיב'], right: 3 },
    { q: 'באיזה מרחק לפחות חייב רכב רגיל לנסוע אחרי רכב ביטחון?',
      a: ['20 מטר', '50 מטר', '100 מטר', 'אין חובה'], right: 2 },
    { q: 'מהו הגורם העיקרי לתאונות בארגון?',
      a: ['תקלות ברכב', 'עייפות, טלפון וחוסר תשומת לב', 'מזג אוויר', 'כבישים משובשים'], right: 1 },
    { q: 'הייתי מעורב בתאונה. מה חשוב לעשות לפני שמזיזים את כלי הרכב?',
      a: ['לצלם גם בווידאו את זירת התאונה מכל הכיוונים', 'להזיז מיד את הרכבים לשול', 'לחכות למשטרה בלי לצלם', 'לעזוב את המקום ולדווח אחר כך'], right: 0 },
    { q: 'מותר להפעיל כריזה ואורות מהבהבים ולצאת לקריאה ששמעתי עליה, בלי הזנקה מהמוקד?',
      a: ['כן, אם זה קרוב אליי', 'כן, אם זה מקרה קשה', 'חל איסור מוחלט, רק לפי הזנקה ממוקד איחוד הצלה', 'כן, אחרי שמודיעים לחבר'], right: 2 },
    { q: 'איפה הג׳ק של האמבולנס נמצא?', img: 'q14.jpg', rimg: 'q15.jpg' /* תמונת התשובה: מופיעה אחרי שכולם סיימו לענות */,
      a: ['מתחת לכיסא הנוסע מקדימה', 'בחלק האחורי של האמבולנס', 'אין ג׳ק באמבולנס', 'מתחת לכיסא הנהג'], right: 0 },
    { q: 'אני מעלה ילד בן שנתיים לאמבולנס. איך אני מושיב אותו?', img: 'q18.jpg', rimg: 'q19.jpg' /* תמונת התשובה: מופיעה אחרי שכולם סיימו לענות */,
      a: ['אסור להעלות אותו בכלל', 'אני אמבולנס, לא צריך בכלל בוסטר', 'יש לי בוסטר באמבולנס', 'תלוי מה הגובה שלו'], right: 2 },
    { q: 'למה נועד החלק הזה באמבולנס?', img: 'q20.jpg',
      a: ['ליופי', 'מטען חיצוני', 'להזין חשמל 220 חיצוני לשקעים', 'מטעין את האמבולנס'], right: 2 },
    { q: 'מה לחץ האוויר התקין בצמיגי האמבולנס?', img: 'q21.jpg',
      a: ['58 מקדימה, 44 מאחורה', '50 בכל הצמיגים', 'על פי הוראות היצרן', '65 מאחורה, 60 מקדימה'], right: 2 },
    { q: 'למה נועד החלק הזה באמבולנס?', img: 'q25.jpg',
      a: ['לדבר עם הצוות מאחורה', 'אין מושג, סתם נמצא שם', 'זה מכוער, צריך להעיף', 'זה רדיו'], right: 0 },
    { q: 'למה יש על האמבולנס מגן דוד אדום בצבע כחול?', img: 'q26.jpg',
      a: ['כי זה ארגון הצלה', 'כי חייב להכניס זכר למד״א', 'וואלה לא יודע', 'תקן של אמבולנס'], right: 3 },
    { q: 'כמה מצברים קיימים באמבולנס?', img: 'q28.jpg',
      a: ['1', '2', '3', '4'], right: 1 },
    { q: 'נכון או לא נכון: מערכת הסייפטי של איתוראן עוזרת לי לדעת איך אני נוהג', img: 'q24.jpg',
      a: ['נכון', 'לא נכון'], right: 0 },
    { q: 'מה הפרייבט של אלי ביר?', img: 'q13.jpg',
      a: ['3,000', '12,000', '40,000', '16,000'], right: 3 },
    { q: 'השלם את כלל הברזל: "אם יש ספק…"', img: 'q11.jpg',
      a: ['…אז נוסעים מהר', '…שואלים את המוקד', '…אין ספק!', '…ממשיכים כרגיל'], right: 2 },
    { q: 'לפי כללי הברזל, מהי המטרה הראשונה?',
      a: ['להגיע ראשון לאירוע', 'לחזור הביתה לשלום', 'לחסוך בזמן', 'לא לקבל דוחות'], right: 1 },
    { q: 'השלם את כלל הברזל: "תאונות לא קורות…"',
      a: ['…הן נגרמות!', '…בלילה', '…לנהגים ותיקים', '…בנסיעת חירום'], right: 0 }
  ]
};

/* המשחקים שמופיעים במסך המארח */
/* ================= בוחן בטיחות אופנוע =================
   השאלות נשמרות כאן בלבד. התמונות נטענות מהאתר (brand/uh = מהקהוט הקודם, brand/moto = משקפי המצגת).
   לשינוי: עורכים שאלה, תשובות (a) או right (מספר התשובה הנכונה, מ-0), ואז שומרים ופורסים גרסה חדשה. */
const MOTO_QUIZ = {
  passCorrect: 10,       // מבחן: כמה תשובות נכונות צריך כדי לעבור
  retakeCount: 10,       // בחינה חוזרת: כמה שאלות אקראיות מתוך כל השאלות
  retakePassCorrect: 8,  // בחינה חוזרת: כמה נכונות צריך כדי לעבור (8 מתוך 10 = 80%)
  title: 'בוחן בטיחות אופנוע',
  description: 'בוחן בטיחות לרוכבי אופנוע, לפי קורס רוכבי האופנוע 2026.',
  img: 'https://dannybd20-hue.github.io/akordim/brand/',
  questions: [
    { q: 'האם לפי החוק רכב ביטחון מחויב להפעיל אורות מהבהבים וסירנה בכל נסיעת חירום?', img: 'uh/q1.jpg',
      a: ['כן, ברור, אחרת הוא לא רכב ביטחון על פי החוק', 'כן, אבל מספיק שהוא ידליק רק רולרים, לא חייב סירנה', 'לא, מספיקים אורות מהבהבים', 'תלוי לאיזה מקרה הוא יוצא'], right: 0 },
    { q: 'אם קיבלתי דוח בנסיעה רגילה, מה עליי לעשות?', img: 'uh/q2.jpg',
      a: ['לחתום על ההסבה ולשלם', 'לארגן מקרה קרוב שלא הייתי בו', 'מה אכפת לי, בעיה של הארגון', 'יש לי סבתא, נסב עליה'], right: 0 },
    { q: 'האם מותר לרכב פרטי להיכנס לצומת באור אדום לצורך פינוי הדרך לאופנוע?', img: 'uh/q3.jpg',
      a: ['כן, ברור, אחרת איך האמבולנס יעבור', 'כן, אבל חייב לעצור לפני הכניסה לצומת', 'אסור לו לעבור בכלל באור אדום', 'רק אם הוא משאית'], right: 2 },
    { q: 'הייתי מעורב בתאונה, נגרם נזק לרכב או שהרכב נגנב. מה עליי לעשות?', img: 'uh/q4.jpg',
      a: ['לדווח לקצין הבטיחות בסוף החודש', 'לעדכן את המוקד 1221 באופן מיידי', 'אם אין נפגעים, לא צריך לדווח', 'לצלם ולשלוח לקבוצת הוואטסאפ של הסניף'], right: 1 },
    { q: 'מהי חובת הנהג כאשר הוא מגיע לצומת ברמזור אדום בנסיעה דחופה?', img: 'uh/q16.jpg',
      a: ['לעצור עצירה מלאה בקו הצומת', 'האטה קלה בלבד, אם יש לי שדה ראייה', 'מעבר מיידי, אם הצומת נראה פנוי', 'סימון לנהגים אחרים עם אורות גבוהים'], right: 0 },
    { q: 'כיצד יש לנהוג במעבר חציה ללא שדה ראייה בנסיעה דחופה?', img: 'uh/q17.jpg',
      a: ['להאט ולחצות כרגיל', 'לעצור לגמרי ולהתקדם בגלישה, במהירות של עד 5 קמ״ש', 'לעקוף את שדה הראייה מצידו השני', 'לצפור ולהמשיך באותה מהירות'], right: 1 },
    { q: 'עמדתי ברמזור אדום, והאור התחלף לירוק. מה חובה לעשות לפני תחילת הנסיעה?', img: 'uh/q7.jpg',
      a: ['לצאת מיד, ירוק זה ירוק', 'להסתכל לשמאל, ישר ולימין, כדי לשלול רכב שמחליט לעבור באדום', 'להסתכל רק במראה האחורית', 'לחכות 10 שניות'], right: 1 },
    { q: 'האם מותר לבצע עקיפת רכבת קלה בנסיעת חירום?', img: 'uh/q27.jpg',
      a: ['רק באישור מוקד', 'אסור בשום אופן', 'רק רכבת שעצרה בתחנה', 'אין נוהל כזה בכלל'], right: 2 },
    { q: 'מהו שול הדרך? והאם מותר לנוע בו בנסיעת חירום על פי החוק?', img: 'uh/q12.jpg',
      a: ['השול הוא משמאל לקו הלבן, והחוק מתיר לנוע שם בזהירות', 'זה נקרא בכלל שוליים ולא שול, ולרכב ביטחון מותר לנוע איפה שהוא צריך', 'החלק הימני שמעבר לקו הצהוב בלבד, ואסור לנוע בו בנסיעת חירום על פי החוק', 'צד שמאל, איפה שהקו הלבן, וצריך לעבור שם בזהירות מרבית'], right: 2 },
    { q: 'לפי הנוהל, אם נאלצים לרדת לשול בזמן חירום, מה המהירות המרבית?', img: 'moto/s119.jpg',
      a: ['עד 20 קמ״ש מעל מהירות התנועה הכללית, ולא יותר מ-50 קמ״ש', 'עד 90 קמ״ש', 'כמו מהירות התנועה בנתיב', 'אין הגבלה כשהסירנה פועלת'], right: 0 },
    { q: 'במקרה של נתיב פנוי בצומת, מה על הנהג לעשות בנסיעה דחופה?', img: 'uh/q22.jpg',
      a: ['להפעיל סירנה מהירה ולנסוע', 'לעבור במהירות כדי לא לעכב', 'רק אם שדה הראייה שלו פתוח, אפשר להאט ולעבור בזהירות', 'לעצור שוב ולסרוק את הנתיב'], right: 3 },
    { q: 'מהו הגורם העיקרי לתאונות בארגון?', img: 'moto/s109.jpg',
      a: ['תקלות ברכב', 'עייפות, טלפון וחוסר תשומת לב', 'מזג אוויר', 'כבישים משובשים'], right: 1 },
    { q: 'הייתי מעורב בתאונה. מה חשוב לעשות לפני שמזיזים את כלי הרכב?', img: 'moto/s34.jpg',
      a: ['לצלם גם בווידאו את זירת התאונה מכל הכיוונים', 'להזיז מיד את הרכבים לשול', 'לחכות למשטרה בלי לצלם', 'לעזוב את המקום ולדווח אחר כך'], right: 0 },
    { q: 'מעבר חצייה ריק, או שיש הולך רגל בקרבתו: מה המהירות המקסימלית למעבר?', img: 'moto/s62.jpg',
      a: ['5 קמ״ש', '15 קמ״ש', '30 קמ״ש', '50 קמ״ש'], right: 1 },
    { q: 'מי מותר להרכיב באופנוע בנסיעת חירום?', img: 'moto/s18.jpg',
      a: ['כל מתנדב בארגון', 'כל אדם שיש לו קסדה', 'רק חובש ומעלה', 'אסור להרכיב אף אחד'], right: 2 },
    { q: 'מה עושים כשמבטלים לך את נסיעת החירום באמצע?', img: 'moto/s57.jpg',
      a: ['מבטלים מיידית', 'ממשיכים עד לאירוע', 'ממשיכים בלי סירנה', 'שואלים את המוקד אם באמת'], right: 0 },
    { q: 'אילו נתונים כדאי לשקול לפני נסיעת חירום?', img: 'moto/s58.jpg',
      a: ['מזג האוויר בלבד', 'סוג המקרה (קל/קשה) ומרחקו ממני', 'כמה זמן נשאר למשמרת', 'כמה אופנועים אחרים בדרך'], right: 1 },
    { q: 'מה הפרייבט של אלי ביר?', img: 'uh/q13.jpg',
      a: ['3,000', '12,000', '40,000', '16,000'], right: 3 },
    { q: 'השלם את כלל הברזל: "אם יש ספק…"', img: 'uh/q11.jpg',
      a: ['…אז נוסעים מהר', '…שואלים את המוקד', '…אין ספק!', '…ממשיכים כרגיל'], right: 2 },
    { q: 'לפי כללי הברזל, מהי המטרה הראשונה?', img: 'moto/s122.jpg',
      a: ['להגיע ראשון לאירוע', 'לחזור הביתה לשלום', 'לחסוך בזמן', 'לא לקבל דוחות'], right: 1 },
    { q: 'השלם את כלל הברזל: "תאונות לא קורות…"', img: 'moto/s121.jpg',
      a: ['…הן נגרמות!', '…בלילה', '…לנהגים ותיקים', '…בנסיעת חירום'], right: 0 }
  ]
};

const GAMES = { hatzalah: HATZALAH_QUIZ, moto: MOTO_QUIZ };

/* ================= משחק חי בסגנון קהוט =================
   המארח פותח משחק מרשימת GAMES ומקבל קוד בן 6 ספרות. השחקנים נכנסים עם הקוד ושם,
   ורואים בטלפון כפתורים צבעוניים. ניקוד: תשובה נכונה = עד 1000 נקודות, לפי מהירות.
   הכול נשמר בזיכרון הזמני של גוגל ל-6 שעות; השחקנים לא רואים את התשובה הנכונה לפני החשיפה. */
const GAME_SECONDS = 6 * 3600;
function gget_(k) { const v = CacheService.getScriptCache().get(k); return v ? JSON.parse(v) : null; }
function gput_(k, o) { CacheService.getScriptCache().put(k, JSON.stringify(o), GAME_SECONDS); }

function game_(d, admin) {
  const a = d.action, now = Date.now(), pin = String(d.pin || '').replace(/\D/g, '');
  if (a === 'rt_start' || a === 'rt_submit') return retake_(a, d); // בחינה חוזרת: לפי קוד, בלי סיסמה ובלי משחק פעיל
  if (a === 'g_list') {
    if (!admin) return { ok: false, error: 'password' };
    return { ok: true, games: Object.keys(GAMES).map(function (k) { return { key: k, title: GAMES[k].title, n: GAMES[k].questions.length }; }) };
  }
  if (a === 'g_create') {
    if (!admin) return { ok: false, error: 'password' };
    /* משחק מהשאלות שבסקריפט (GAMES); התמונות נטענות ישירות מהאתר */
    const G = GAMES[d.key];
    if (!G) return { ok: false, error: 'משחק לא קיים' };
    const def = { title: G.title, qs: G.questions.map(function (x) { return { t: x.q, ch: x.a, right: x.right }; }),
      imgs: G.questions.map(function (x) { return x.img ? G.img + x.img : null; }),
      rimgs: G.questions.map(function (x) { return x.rimg ? G.img + x.rimg : null; }) };
    let p;
    do { p = String(100000 + Math.floor(Math.random() * 900000)); } while (gget_('g:' + p));
    def.imgs.forEach(function (im, i) { if (im) { try { gput_('gi:' + p + ':' + i, im); } catch (x) {} } });
    def.rimgs.forEach(function (im, i) { if (im) { try { gput_('gri:' + p + ':' + i, im); } catch (x) {} } }); // תמונת התשובה, מוצגת בחשיפה
    gput_('gd:' + p, { title: def.title, qs: def.qs });
    gput_('gp:' + p, {});
    const g = { pin: p, key: d.key, title: def.title, n: def.qs.length, q: -1, phase: 'lobby', qStart: 0,
      dur: Math.min(60, Math.max(5, Number(d.dur) || 20)),
      lb: Math.max(0, Math.min(20, Number(d.lb) || 0)), // טבלת מובילים כל lb שאלות; 0 = רק בסוף
      pass: Number(G.passCorrect) || 0, retake: Number(G.retakeCount) || 0,
      scores: {}, last: {}, created: now };
    gput_('g:' + p, g);
    const act = (gget_('gact') || []).filter(function (x) { return gget_('g:' + x); });
    act.unshift(p); gput_('gact', act.slice(0, 10));
    return { ok: true, game: g };
  }
  if (a === 'g_active') { // משחקים פעילים, כדי להמשיך ממכשיר אחר
    if (!admin) return { ok: false, error: 'password' };
    const list = [];
    (gget_('gact') || []).forEach(function (x) {
      const gg = gget_('g:' + x);
      if (gg && gg.phase !== 'end') list.push({ pin: x, key: gg.key, title: gg.title, phase: gg.phase, q: gg.q, n: gg.n, players: Object.keys(gget_('gp:' + x) || {}).length, created: gg.created });
    });
    return { ok: true, games: list };
  }
  const g = gget_('g:' + pin);
  if (!g) return { ok: false, error: 'nogame' };

  if (a === 'g_join') {
    const name = String(d.name || '').trim().slice(0, 20);
    if (!name) return { ok: false, error: 'נא לכתוב שם' };
    const phone = String(d.phone || '').replace(/\D/g, '');
    if (!(d.pid && (gget_('gp:' + pin) || {})[d.pid]) && (phone.length < 1 || phone.length > 10)) return { ok: false, error: 'נא לכתוב מס\' כונן (1 עד 10 ספרות)' };
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const pl = gget_('gp:' + pin) || {};
      if (d.pid && pl[d.pid]) return { ok: true, pid: d.pid, name: pl[d.pid] };
      const taken = Object.keys(pl).map(function (k) { return pl[k]; });
      let nm = name, i = 2;
      while (taken.indexOf(nm) >= 0) nm = name + ' ' + (i++);
      const pid = Utilities.getUuid().slice(0, 8);
      pl[pid] = nm; gput_('gp:' + pin, pl);
      const ph = gget_('gph:' + pin) || {}; ph[pid] = phone; gput_('gph:' + pin, ph);
      return { ok: true, pid: pid, name: nm };
    } finally { lock.releaseLock(); }
  }

  if (a === 'g_state') { // שחקן: מצב המשחק ומה שקשור אליו
    const def = gget_('gd:' + pin), pid = String(d.pid || ''), pl = gget_('gp:' + pin) || {};
    if (!pl[pid]) return { ok: true, kicked: true, phase: g.phase };
    const r = { ok: true, now: now, phase: g.phase, q: g.q, n: g.n, qStart: g.qStart, dur: g.dur, title: g.title, name: pl[pid],
      score: g.scores[pid] || 0, last: g.last[pid] || null, closed: !!g.closed, chg: g.chg !== false, chs: chs_(g) };
    if (g.phase === 'question' && def) {
      const Q = def.qs[g.q]; r.text = Q.t; r.ch = Q.ch; r.img = gget_('gi:' + pin + ':' + g.q) || null; // התמונה של השאלה (כתובת באתר), כדי שהשחקן יראה אותה גם בטלפון
      const my = gget_('ga:' + pin + ':' + g.q + ':' + pid);
      r.answered = !!my; if (my) { r.ac = my.c; r.until = (my.at || 0) + chs_(g) * 1000; } // התשובה שנבחרה ועד מתי אפשר לשנות
    }
    if (g.phase === 'end' && g.pass && !g.closed) {
      const ex = gget_('gx:' + pin) || { cor: {}, reg: {} }, c = ex.cor[pid] || 0;
      r.exam = { c: c, n: g.n, need: g.pass, pass: c >= g.pass, retake: g.retake > 0, code: (ex.reg || {})[pid] || null };
    }
    if (g.phase === 'reveal') r.rimg = gget_('gri:' + pin + ':' + g.q) || null; // תמונת התשובה
    if (g.phase === 'reveal' || g.phase === 'leader' || g.phase === 'end') {
      const order = Object.keys(g.scores).sort(function (x, y) { return g.scores[y] - g.scores[x]; });
      r.rank = order.indexOf(pid) + 1; r.players = order.length;
    }
    return r;
  }

  if (a === 'g_answer') {
    const c = Number(d.c);
    if (g.phase !== 'question') return { ok: false, error: 'late' };
    const st = now - g.qStart;
    if (st > g.dur * 1000 + 4000) return { ok: false, error: 'late' };
    /* זמן הוגן: הטלפון מודד מהרגע שהשאלה הופיעה אצלו; מקבלים אותו רק עד 3 שניות פחות ממה שהשרת מדד (השהיית רשת) */
    const el = Number(d.el);
    const t = isFinite(el) && el >= 0 ? Math.max(st - 3000, Math.min(st, el)) : st;
    const k = 'ga:' + pin + ':' + g.q + ':' + String(d.pid || '');
    /* שינוי תשובה: מותר רק CHANGE_SECONDS שניות מהתשובה הראשונה, וכל עוד הזמן של השאלה לא נגמר.
       התשובה האחרונה היא הקובעת, וגם הזמן שלה */
    const prev = gget_(k);
    if (prev && (g.chg === false || st > g.dur * 1000 + 1500 || now - (prev.at || 0) > chs_(g) * 1000 + 1500)) return { ok: true, already: true };
    gput_(k, { c: c, t: Math.max(0, t), at: prev ? prev.at : now });
    return { ok: true, until: (prev ? prev.at : now) + chs_(g) * 1000, now: now };
  }

  if (a === 'g_retake') { // שחקן שנכשל נרשם לבחינה חוזרת ומקבל קוד
    const pid = String(d.pid || ''), pl0 = gget_('gp:' + pin) || {};
    if (g.phase !== 'end' || !g.pass || !g.retake) return { ok: false, error: 'אין בחינה חוזרת למשחק הזה' };
    if (!pl0[pid]) return { ok: false, error: 'לא נמצא שחקן' };
    const lock = LockService.getScriptLock(); lock.waitLock(15000);
    try {
      const ex = gget_('gx:' + pin) || { cor: {}, wr: {} };
      if ((ex.cor[pid] || 0) >= g.pass) return { ok: false, error: 'עברת את המבחן, אין צורך בבחינה חוזרת' };
      ex.reg = ex.reg || {};
      if (ex.reg[pid]) return { ok: true, code: ex.reg[pid] };
      const sh = examSheet_().getSheets()[0];
      let r = examFindPid_(sh, pin, pid);
      if (!r) { // לא נרשם בסוף המשחק (למשל בגלל שגיאה) – מוסיפים עכשיו
        const def = gget_('gd:' + pin), phs = gget_('gph:' + pin) || {};
        r = sh.getLastRow() + 1;
        examWrite_(sh, r, [examRow_(Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd.MM.yyyy HH:mm'), g, pin, pid, pl0[pid], phs[pid] || '', ex.cor[pid] || 0, false, ex.wr[pid] || [], def)]);
      }
      let code; do { code = examCode_(); } while (examFind_(sh, 11, code));
      sh.getRange(r, 10, 1, 2).setValues([[Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd.MM.yyyy HH:mm'), code]]);
      ex.reg[pid] = code; gput_('gx:' + pin, ex);
      return { ok: true, code: code };
    } finally { lock.releaseLock(); }
  }

  /* מכאן: פעולות המארח */
  if (!admin) return { ok: false, error: 'password' };
  const pl = gget_('gp:' + pin) || {}, pids = Object.keys(pl);

  if (a === 'g_host') {
    let answered = 0, done = [];
    if (g.phase === 'question') {
      const got = CacheService.getScriptCache().getAll(pids.map(function (p) { return 'ga:' + pin + ':' + g.q + ':' + p; }));
      done = pids.filter(function (p) { return got['ga:' + pin + ':' + g.q + ':' + p]; });
      answered = done.length;
    }
    const phs = gget_('gph:' + pin) || {};
    return { ok: true, now: now, game: g, players: pids.map(function (p) { return { pid: p, name: pl[p], phone: phs[p] || '', score: g.scores[p] || 0 }; }), answered: answered, done: done };
  }

  if (a === 'g_rename' || a === 'g_kick') { // ניהול שחקנים: שינוי שם או הוצאה מהמשחק
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const pl2 = gget_('gp:' + pin) || {}, id = String(d.pid || '');
      if (!pl2[id]) return { ok: false, error: 'אין שחקן כזה' };
      if (a === 'g_rename') {
        const nm = String(d.name || '').trim().slice(0, 20);
        if (!nm) return { ok: false, error: 'נא לכתוב שם' };
        pl2[id] = nm;
      } else {
        const g2 = gget_('g:' + pin); delete g2.scores[id]; if (g2.last) delete g2.last[id]; gput_('g:' + pin, g2); delete pl2[id];
      }
      gput_('gp:' + pin, pl2);
      return { ok: true };
    } finally { lock.releaseLock(); }
  }

  if (a === 'g_set') { // הגדרות המארח באמצע המשחק: chg = האם מותר לשנות תשובה עד שהזמן נגמר
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try { const g2 = gget_('g:' + pin); if ('chg' in d) g2.chg = !!d.chg; if ('chs' in d) { const n = Math.round(Number(d.chs)); if (n > 0 && n <= 600) g2.chs = n; } gput_('g:' + pin, g2); return { ok: true, now: now, game: g2 }; }
    finally { lock.releaseLock(); }
  }

  if (a === 'g_next') { // לובי ← שאלה ← חשיפה ← (טבלת מובילים לפי ההגדרה) ← שאלה ← ... ← סיום
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try { return gnext_(pin, d, now, pids); } finally { lock.releaseLock(); }
  }

  if (a === 'g_sheet') return gsheet_(pin, g, pl);

  if (a === 'g_qs') { // רשימת כל השאלות, בשביל "קפוץ לשאלה"
    const def = gget_('gd:' + pin); if (!def) return { ok: false, error: 'nogame' };
    return { ok: true, qs: def.qs.map(function (x) { return x.t; }) };
  }

  if (a === 'g_goto') { // קפיצה לשאלה כלשהי (קדימה או אחורה)
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const g2 = gget_('g:' + pin), q = Number(d.q);
      if (!(q >= 0 && q < g2.n)) return { ok: false, error: 'שאלה לא קיימת' };
      if (g2.phase === 'end') return { ok: false, error: 'המשחק כבר הסתיים' };
      const keys = Object.keys(gget_('gp:' + pin) || {}).map(function (p) { return 'ga:' + pin + ':' + q + ':' + p; });
      if (keys.length) CacheService.getScriptCache().removeAll(keys); // מנקים תשובות קודמות לשאלה הזאת
      g2.q = q; g2.phase = 'question'; g2.qStart = now + 800; g2.dist = null; g2.right = null; g2.last = {};
      gput_('g:' + pin, g2);
      return { ok: true, now: now, game: g2 };
    } finally { lock.releaseLock(); }
  }

  if (a === 'g_close') { // סגירת משחק: השחקנים רואים "המשחק הסתיים" והוא יורד מרשימת המשחקים הפעילים
    g.phase = 'end'; g.closed = true; gput_('g:' + pin, g);
    gput_('gact', (gget_('gact') || []).filter(function (x) { return x !== pin; }));
    return { ok: true };
  }

  if (a === 'g_q') { // המארח: השאלה הנוכחית עם התמונה
    const def = gget_('gd:' + pin), i = g.q;
    if (!def || i < 0 || i >= g.n) return { ok: false, error: 'no question' };
    return { ok: true, q: def.qs[i], img: gget_('gi:' + pin + ':' + i), rimg: gget_('gri:' + pin + ':' + i) };
  }
  return { ok: false, error: 'unknown action' };
}

function gnext_(pin, d, now, pids) {
  const g = gget_('g:' + pin), def = gget_('gd:' + pin);
  /* אם המחשב והטלפון לחצו "הבא" ביחד – רק הלחיצה הראשונה נחשבת */
  if (d.from && d.from !== g.phase + ':' + g.q) return { ok: true, now: now, game: g, stale: true };
  const nextQ = function () {
    g.q++;
    if (g.q >= g.n) { g.phase = 'end'; }
    else { g.phase = 'question'; g.qStart = now + 800; g.dist = null; g.right = null; }
  };
  if (g.phase === 'lobby' || g.phase === 'leader') {
    nextQ();
  } else if (g.phase === 'question') {
    const Q = def.qs[g.q], dist = Q.ch.map(function () { return 0; });
    const got = CacheService.getScriptCache().getAll(pids.map(function (p) { return 'ga:' + pin + ':' + g.q + ':' + p; }));
    g.last = {};
    const rec = {};
    const prior0 = gget_('gr:' + pin + ':' + g.q);
    if (prior0) {
      const ex0 = gget_('gx:' + pin) || { cor: {}, wr: {}, reg: {} };
      pids.forEach(function (p) {
        const v = prior0[p];
        if (v) { g.scores[p] = Math.max(0, (g.scores[p] || 0) - v[1]); if (v[0] === Q.right) ex0.cor[p] = Math.max(0, (ex0.cor[p] || 0) - 1); }
        ex0.wr[p] = (ex0.wr[p] || []).filter(function (i) { return i !== g.q; });
      });
      gput_('gx:' + pin, ex0);
    }
    pids.forEach(function (p) {
      const v = got['ga:' + pin + ':' + g.q + ':' + p];
      if (!v) { g.last[p] = { ok: false, p: 0, none: true }; if (!(p in g.scores)) g.scores[p] = 0; return; }
      const ans = JSON.parse(v), ok = ans.c === Q.right;
      if (dist[ans.c] !== undefined) dist[ans.c]++;
      const pts = ok ? Math.round(1000 * (1 - Math.min(1, ans.t / (g.dur * 1000)) / 2)) : 0;
      g.scores[p] = (g.scores[p] || 0) + pts;
      rec[p] = [ans.c, pts, Math.round(ans.t)];
      g.last[p] = { ok: ok, p: pts, c: ans.c }; // c: איזו תשובה בחר (בשביל "מי ענה מה" אצל המארח)
    });
    gput_('gr:' + pin + ':' + g.q, rec); // התשובות של כולם לשאלה הזאת, בשביל הטבלה בגוגל שיטס
    const ex = gget_('gx:' + pin) || { cor: {}, wr: {}, reg: {} }; // לכל שחקן: כמה נכונות ובאילו שאלות טעה או לא ענה (בשביל המבחן)
  pids.forEach(function (p) { const l = g.last[p]; if (l && l.ok) ex.cor[p] = (ex.cor[p] || 0) + 1; else (ex.wr[p] = ex.wr[p] || []).push(g.q); });
  gput_('gx:' + pin, ex);
  g.phase = 'reveal'; g.dist = dist; g.right = Q.right;
  } else if (g.phase === 'reveal') {
    /* d.show: 'board' = להציג טבלה עכשיו, 'skip' = לדלג עליה; בלי = לפי ההגדרה (כל lb שאלות) */
    const due = g.lb > 0 && (g.q + 1) % g.lb === 0;
    const show = d.show === 'board' ? true : d.show === 'skip' ? false : due;
    if (g.q >= g.n - 1) g.phase = 'end';
    else if (show) g.phase = 'leader';
    else nextQ();
  }
  if (g.phase === 'end' && g.pass && !g.examDone) { // סוף המשחק: ציון לכל שחקן נכנס לטבלת המבחנים הקבועה
    try { const rr = examRecord_(g, pin, gget_('gp:' + pin) || {}); g.examDone = true; g.examPass = rr.pass; g.examFail = rr.fail; g.examUrl = rr.url; g.examErr = ''; }
    catch (x) { g.examErr = String(x && x.message || x).slice(0, 140); }
  }
  if (g.phase === 'end' && !g.endDone) { // סוף המשחק: שאלות קשות + הודעת סיכום לקבוצת הוואטסאפ (אם חוברה)
    g.endDone = true;
    try {
      const pl2 = gget_('gp:' + pin) || {}, hq = hardQs_(g, pin, pl2, def);
      g.hard = hq.slice(0, 5).filter(function (x) { return x.wp > 0; });
      if (g.examUrl) { try { examHardRows_(g, pin, hq); } catch (x) {} }
      if (waOn_()) g.waSent = !!waSend_(podiumText_(g, pl2));
    } catch (x) { g.endErr = String(x && x.message || x).slice(0, 120); }
  }
  gput_('g:' + pin, g);
  return { ok: true, now: now, game: g };
}

/* שאלות קשות: לכל שאלה שנשאלה, כמה אחוז מהשחקנים לא ענו נכון (כולל מי שלא ענה). ממוין מהקשה לקלה */
function hardQs_(g, pin, pl, def) {
  const N = Object.keys(pl).length, out = [];
  if (N < 3) return out;
  for (let i = 0; i < g.n; i++) {
    const rec = gget_('gr:' + pin + ':' + i);
    if (!rec) continue;
    let ok = 0;
    Object.keys(pl).forEach(function (p) { if (rec[p] && rec[p][0] === def.qs[i].right) ok++; });
    out.push({ n: i + 1, t: def.qs[i].t, N: N, ok: ok, wp: Math.round(100 * (N - ok) / N) });
  }
  return out.sort(function (a, b) { return b.wp - a.wp || a.n - b.n; });
}
/* מוסיף לטבלת המבחנים הקבועה גיליון "שאלות קשות" שמצטבר מכל המשחקים */
function examHardRows_(g, pin, hq) {
  if (!hq.length) return;
  const ss = examSheet_();
  let sh = ss.getSheetByName('שאלות קשות');
  if (!sh) {
    sh = ss.insertSheet('שאלות קשות'); sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, 7).setValues([['תאריך', 'משחק', 'שאלה #', 'שאלה', 'משתתפים', 'ענו נכון', '% שלא ענו נכון']]).setFontWeight('bold').setBackground('#4f46e5').setFontColor('#ffffff');
    sh.setFrozenRows(1); sh.setColumnWidth(4, 420);
  }
  const date = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd.MM.yyyy HH:mm');
  sh.getRange(sh.getLastRow() + 1, 1, hq.length, 7).setValues(hq.map(function (x) { return [date, g.title, x.n, x.t, x.N, x.ok, x.wp]; }));
}
/* הודעת סיכום לקבוצה: הפודיום, כמה עברו, והשאלה הכי קשה (בלי שמות של מי שנכשל) */
function podiumText_(g, pl) {
  const order = Object.keys(pl).sort(function (x, y) { return (g.scores[y] || 0) - (g.scores[x] || 0); });
  const medals = ['🥇', '🥈', '🥉'];
  const top = order.slice(0, 3).map(function (p, i) { return medals[i] + ' ' + pl[p] + ' (' + (g.scores[p] || 0).toLocaleString() + ')'; });
  let t = '🏆 *' + g.title + '*\nתוצאות המשחק:\n' + top.join('\n') + '\n\n👥 ' + order.length + ' משתתפים';
  if (g.pass && g.examPass !== undefined) t += '\n✅ עברו ' + g.examPass + ' · ❌ נכשלו ' + g.examFail;
  if (g.hard && g.hard.length) t += '\n📉 השאלה הכי קשה (' + g.hard[0].wp + '% לא ענו נכון):\n' + g.hard[0].t;
  return t;
}

/* ---------------- הודעות וואטסאפ (Green API) ----------------
   מאפייני סקריפט (⚙️ הגדרות הפרויקט): GREEN_URL, GREEN_ID, GREEN_TOKEN,
   ואחד מהשניים: GREEN_GROUP = שם הקבוצה (למשל: קציני בטיחות), או GREEN_CHAT = מזהה (120363…@g.us).
   בלי המאפיינים האלה לא נשלחת שום הודעה. בדיקה: testWhatsapp. */
function waCfg_() {
  const p = PropertiesService.getScriptProperties();
  const c = { url: (p.getProperty('GREEN_URL') || '').replace(/\/+$/, ''), id: p.getProperty('GREEN_ID') || '', token: p.getProperty('GREEN_TOKEN') || '',
    chat: p.getProperty('GREEN_CHAT') || '', group: p.getProperty('GREEN_GROUP') || '' };
  return c.url && c.id && c.token && (c.chat || c.group) ? c : null;
}
function waOn_() { return !!waCfg_(); }
function waChat_(c) {
  if (c.chat) return c.chat;
  const res = UrlFetchApp.fetch(c.url + '/waInstance' + c.id + '/getContacts/' + c.token, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return '';
  const want = c.group.trim().toLowerCase();
  const g = JSON.parse(res.getContentText()).filter(function (x) { return /@g\.us$/.test(x.id) && String(x.name || '').trim().toLowerCase() === want; })[0];
  if (!g) { console.warn('לא נמצאה קבוצה בשם ' + c.group); return ''; }
  PropertiesService.getScriptProperties().setProperty('GREEN_CHAT', g.id);
  return g.id;
}
function waSend_(text) {
  const c = waCfg_(); if (!c) return false;
  const chat = waChat_(c); if (!chat) return false;
  const res = UrlFetchApp.fetch(c.url + '/waInstance' + c.id + '/sendMessage/' + c.token, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ chatId: chat, message: text }) });
  if (res.getResponseCode() !== 200) { console.warn('whatsapp ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200)); return false; }
  return true;
}
function testWhatsapp() {
  Logger.log(waOn_() ? (waSend_('🏆 הודעת ניסיון ממשחק חי ✅') ? 'נשלח ✅' : 'לא נשלח, ראה אזהרה ביומן') : 'חסר GREEN_URL / GREEN_ID / GREEN_TOKEN ואחד מ-GREEN_GROUP / GREEN_CHAT');
}


/* ===== טבלה בגוגל שיטס: כל שחקן, הטלפון שלו, הניקוד, ומה ענה בכל שאלה ===== */
/* כל הטבלאות של המשחק (טבלת המבחנים וטבלאות הציונים) נשמרות בתיקייה אחת בדרייב */
const FOLDER_NAME = 'משחק חי – ציונים ומבחנים';
function gameFolder_() {
  const props = PropertiesService.getScriptProperties(), id = props.getProperty('GAME_FOLDER_ID');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (x) {} }
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('GAME_FOLDER_ID', f.getId());
  return f;
}
function toFolder_(ss) { // מעביר גיליון חדש לתיקייה; אם אין הרשאת דרייב, הגיליון נשאר איפה שנוצר
  try { DriveApp.getFileById(ss.getId()).moveTo(gameFolder_()); } catch (x) {}
  return ss;
}
function authorizeSheets() { // להריץ פעם אחת מהעורך: מאשר הרשאות גיליונות ודרייב, ויוצר את התיקייה
  gameFolder_();
  const ss = SpreadsheetApp.create('בדיקת הרשאה – אפשר למחוק'); toFolder_(ss);
}
/* מריצים פעם אחת מהעורך כדי לסדר טבלאות שנוצרו קודם לתיקייה: organizeExisting ← "הפעלה" */
function organizeExisting() {
  const folder = gameFolder_(); let n = 0;
  ['משחק חי – ', 'מבחנים – משחק חי', 'בדיקת הרשאה – אפשר למחוק'].forEach(function (p) {
    const it = DriveApp.searchFiles("title contains '" + p + "' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and 'me' in owners");
    while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf(p) === 0) { f.moveTo(folder); n++; } }
  });
  Logger.log('הועברו לתיקייה ' + FOLDER_NAME + ': ' + n + ' קבצים');
}
function gsheet_(pin, g, pl) {
  if (g.sheet) return { ok: true, url: g.sheet, already: true };
  const def = gget_('gd:' + pin), phs = gget_('gph:' + pin) || {};
  const pids = Object.keys(pl).sort(function (x, y) { return (g.scores[y] || 0) - (g.scores[x] || 0); });
  const done = g.phase === 'end' ? g.n : g.q + 1; // כמה שאלות כבר נענו
  const recs = [];
  for (let i = 0; i < done; i++) recs.push(gget_('gr:' + pin + ':' + i) || {});
  const L = ['א', 'ב', 'ג', 'ד'];
  const head = ['מקום', 'שם', 'מס\' כונן', 'ניקוד', 'ענו נכון'];
  for (let i = 0; i < done; i++) head.push('שאלה ' + (i + 1));
  const rows = [], colors = [];
  pids.forEach(function (p, r) {
    let okN = 0; const row = [r + 1, pl[p], phs[p] || '', g.scores[p] || 0, 0], col = ['', '', '', '', ''];
    for (let i = 0; i < done; i++) {
      const v = recs[i][p], Q = def.qs[i];
      if (!v) { row.push('— לא ענה'); col.push('#e5e7eb'); }
      else if (v[0] === Q.right) { okN++; row.push('✓ ' + L[v[0]] + ' · ' + Q.ch[v[0]] + ' (+' + v[1] + ')'); col.push('#bbf7d0'); }
      else { row.push('✗ ' + L[v[0]] + ' · ' + (Q.ch[v[0]] || '')); col.push('#fecdd3'); }
    }
    row[4] = okN + ' מתוך ' + done; rows.push(row); colors.push(col);
  });
  const ss = toFolder_(SpreadsheetApp.create('משחק חי – ' + g.title + ' – ' + Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd.MM.yyyy HH:mm')));
  const sh = ss.getSheets()[0]; sh.setName('תוצאות'); sh.setRightToLeft(true);
  sh.getRange(1, 3, rows.length + 1, 1).setNumberFormat('@');
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#4f46e5').setFontColor('#ffffff');
  if (rows.length) {
    sh.getRange(2, 1, rows.length, head.length).setValues(rows).setBackgrounds(colors.map(function (c) { return c.map(function (x) { return x || '#ffffff'; }); }));
  }
  sh.setFrozenRows(1); sh.setFrozenColumns(2);
  sh.autoResizeColumns(1, Math.min(head.length, 5));
  const qs = ss.insertSheet('שאלות'); qs.setRightToLeft(true);
  const qrows = [['#', 'שאלה', 'התשובה הנכונה', 'ענו נכון', 'ענו לא נכון', 'לא ענו']];
  for (let i = 0; i < done; i++) {
    let ok = 0, no = 0;
    pids.forEach(function (p) { const v = recs[i][p]; if (v) { if (v[0] === def.qs[i].right) ok++; else no++; } });
    qrows.push([i + 1, def.qs[i].t, def.qs[i].ch[def.qs[i].right], ok, no, pids.length - ok - no]);
  }
  qs.getRange(1, 1, qrows.length, 6).setValues(qrows); qs.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#4f46e5').setFontColor('#ffffff');
  qs.setFrozenRows(1); qs.setColumnWidth(2, 420); qs.setColumnWidth(3, 260);
  g.sheet = ss.getUrl(); gput_('g:' + pin, g);
  return { ok: true, url: g.sheet };
}


/* ===== מבחן: ציון עובר / לא עובר, טבלה קבועה בגוגל שיטס, ובחינה חוזרת ===== */
const EXAM_HEAD = ['תאריך', 'משחק', 'שם', 'מס\' כונן', 'נכונות', 'מתוך', 'ציון %', 'סטטוס', 'על מה לא ענה נכון', 'נרשם לבחינה חוזרת', 'קוד בחינה חוזרת',
  'חוזרת: נכונות', 'חוזרת: מתוך', 'חוזרת: ציון %', 'חוזרת: סטטוס', 'חוזרת: על מה לא ענה נכון', 'תאריך בחינה חוזרת', 'pin', 'pid', 'key', 'שאלות בחינה חוזרת'];
const EXAM_TEXT_COLS = [4, 11, 18, 19, 21];

function examSheet_() { // טבלה אחת קבועה לכל המשחקים; נוצרת אוטומטית בפעם הראשונה
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('EXAM_SHEET_ID');
  let ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (x) { ss = null; } }
  if (!ss) {
    ss = toFolder_(SpreadsheetApp.create('מבחנים – משחק חי'));
    props.setProperty('EXAM_SHEET_ID', ss.getId());
    const sh = ss.getSheets()[0]; sh.setName('ציונים'); sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, EXAM_HEAD.length).setValues([EXAM_HEAD]).setFontWeight('bold').setBackground('#4f46e5').setFontColor('#ffffff');
    sh.setFrozenRows(1); sh.setFrozenColumns(3);
  }
  return ss;
}
function examCode_() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 6; i++) c += A.charAt(Math.floor(Math.random() * A.length)); return c; }
function examWrongText_(def, list) { return list.map(function (i) { return (i + 1) + '. ' + def.qs[i].t; }).join('\n'); }
function examRow_(date, g, pin, pid, name, car, c, ok, wr, def) {
  return [date, g.title, name, car, c, g.n, Math.round(100 * c / g.n), ok ? 'עובר' : 'לא עובר', examWrongText_(def, wr), '', '', '', '', '', '', '', '', pin, pid, g.key, ''];
}
function examWrite_(sh, start, rows) {
  EXAM_TEXT_COLS.forEach(function (c) { sh.getRange(start, c, rows.length, 1).setNumberFormat('@'); });
  sh.getRange(start, 1, rows.length, EXAM_HEAD.length).setValues(rows);
}
function examFind_(sh, col, val) { // מחזיר מספר שורה לפי ערך בעמודה, או 0
  const n = sh.getLastRow(); if (n < 2) return 0;
  const v = sh.getRange(2, col, n - 1, 1).getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][0]) === val) return i + 2;
  return 0;
}
function examFindPid_(sh, pin, pid) {
  const n = sh.getLastRow(); if (n < 2) return 0;
  const v = sh.getRange(2, 18, n - 1, 2).getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][0]) === pin && String(v[i][1]) === pid) return i + 2;
  return 0;
}
function examRecord_(g, pin, pl) {
  const def = gget_('gd:' + pin), ex = gget_('gx:' + pin) || { cor: {}, wr: {} }, phs = gget_('gph:' + pin) || {};
  const ss = examSheet_(), sh = ss.getSheets()[0];
  const date = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd.MM.yyyy HH:mm');
  const pids = Object.keys(pl).sort(function (x, y) { return (g.scores[y] || 0) - (g.scores[x] || 0); });
  let pass = 0, fail = 0; const rows = [];
  pids.forEach(function (p) {
    const c = ex.cor[p] || 0, ok = c >= g.pass; if (ok) pass++; else fail++;
    rows.push(examRow_(date, g, pin, p, pl[p], phs[p] || '', c, ok, ex.wr[p] || [], def));
  });
  if (rows.length) examWrite_(sh, sh.getLastRow() + 1, rows);
  return { pass: pass, fail: fail, url: ss.getUrl() };
}
/* בחינה חוזרת: סדר התשובות בכל שאלה מעורבב לכל נבחן (קבוע לפי הקוד האישי שלו, כך שפתיחה חוזרת מציגה אותו סדר) */
function perm_(code, i, n) {
  let h = 2166136261; const str = code + ':' + i;
  for (let k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 16777619); }
  const rnd = function () { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a = []; for (let k = 0; k < n; k++) a.push(k);
  for (let k = n - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)), t = a[k]; a[k] = a[j]; a[j] = t; }
  return a;
}
function retake_(a, d) { // בחינה חוזרת: מקבל קוד, בוחר לשחקן שאלות אקראיות (פעם אחת), ומחשב את הציון
  const code = String(d.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return { ok: false, error: 'הקוד לא תקין' };
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = examSheet_().getSheets()[0], r = examFind_(sh, 11, code);
    if (!r) return { ok: false, error: 'הקוד לא נמצא' };
    const row = sh.getRange(r, 1, 1, EXAM_HEAD.length).getValues()[0], G = GAMES[row[19]];
    if (!G) return { ok: false, error: 'המבחן הזה כבר לא זמין' };
    if (row[14]) return { ok: true, done: true, name: row[2], c: row[11], n: row[12], pass: row[14] === 'עובר' };
    let idx = String(row[20] || '').split(',').filter(function (x) { return x !== ''; }).map(Number);
    if (!idx.length) {
      const all = G.questions.map(function (x, i) { return i; });
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)), t = all[i]; all[i] = all[j]; all[j] = t; }
      idx = all.slice(0, Math.min(G.retakeCount || 10, all.length));
      sh.getRange(r, 21).setValue(idx.join(','));
    }
    if (a === 'rt_start') {
      return { ok: true, name: row[2], title: G.title, qs: idx.map(function (i) { const Q = G.questions[i]; const pm = perm_(code, i, Q.a.length); return { i: i, t: Q.q, ch: pm.map(function (k) { return Q.a[k]; }), img: Q.img ? G.img + Q.img : null }; }) };
    }
    const ans = d.answers || {}; let c = 0; const wr = [];
    idx.forEach(function (i) { const pm = perm_(code, i, G.questions[i].a.length); if (pm[Number(ans[i])] === G.questions[i].right) c++; else wr.push(G.questions[i].q ? (i + 1) + '. ' + G.questions[i].q : String(i + 1)); });
    const need = G.retakePassCorrect || Math.ceil(idx.length * 0.8), ok = c >= need;
    sh.getRange(r, 12, 1, 6).setValues([[c, idx.length, Math.round(100 * c / idx.length), ok ? 'עובר' : 'לא עובר', wr.join('\n'), Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd.MM.yyyy HH:mm')]]);
    return { ok: true, done: true, name: row[2], c: c, n: idx.length, pass: ok };
  } finally { lock.releaseLock(); }
}
