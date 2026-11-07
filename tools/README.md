# כלי עדכון נתונים (קצב"ת / סייפטי / בטיחות סניף)

`workspace.bin` – גיבוי מוצפן (AES-GCM, PBKDF2 600k, מבנה KB1 כמו kbt/kbt.bin) של סקריפטי הבנייה,
קבצי המקור והסיסמאות. נפתח עם סיסמת ניהול קצב"ת. אחרי פענוח: קובץ tar.gz (בתוכו עוד gzip אחד).

שחזור בסשן חדש:
1. פענוח workspace.bin עם הסיסמה → פריסה ל-/home/claude (תיקיות kbt, safety, coord, ride, acc/raw, ws).
2. ws/ מכיל את קבצי המקור האחרונים ואת pw.txt.
3. עדכון: kbt/build.py → kbt/encrypt.py → kbt/kbt.bin; safety/build.py (+pdfs.py) → safety/safety.bin;
   ride/build.py → kbt/ride.bin; coord/build.py → coord/*.bin; coord/assemble.py → coord.html.

עדכון 05/11/2026:
- טבלת אנשי הקשר החדשה (עם קורסים, השתלמות רכיבה, טסטים): ws/src/bc3262b0-…xlsx. יש לשחזר ממנה את ws/pb.pkl
  (שורת הכותרת היא השורה שמתחילה ב"שם מלא"; to_pickle).
- ws/altparse.py – פענוח טופס אלטרנתיבי (acc/raw/alt_new.xlsx מהדרייב).
- acc2/build.py – טבלת התאונות (ws/src/a8bbd08d-…xlsx) → kbt/acc.bin; acc2/ai.json – ממצאים/מסקנות שנוסחו.
- kbt/acc.js + kbt/acc_inject.py – לשונית התאונות ב-kbt.html (מוזרק, לא דרך port.py – port.py ישן!).
- coord/map.js – מפת אופנוענים. coord-script.gs (עם מפתחות) נמצא רק בגיבוי.

עדכון 07/11/2026 – "מה השתנה":
- אחרי kbt/build.py מריצים `python3 ws/changes.py` (לפני ההצפנה של data.json). הסקריפט משווה לצילום של העדכון הקודם
  (ws/snap/DD-MM-YYYY.json), שומר היסטוריה ב-ws/chglog.json (30 עדכונים) ומכניס DATA.chg ל-kbt.bin.
- kbt/chg.js + kbt/chg_inject.py – לשונית "מה השתנה" ב-kbt.html + סימון שורות/כרטיסים שהשתנו.
