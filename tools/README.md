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

- ws/changes.py מזהה גם "בוגרים": משתלם X -> אישור נהיגה X רגיל, ושומר ב-ws/grads.json (45 יום). coord/build.py מוסיף DATA.grads, והרכז מקבל הודעה קופצת עם הודעת ברכה.

- ק"מ חודשי: דו"ח פעילות תקופתית מאיתורן (xlsx) -> python3 ws/km.py <file> -> ws/kmhist.json (לפי חודש, רק נהגי מרחב ירושלים). add_extra.py ו-coord/build.py מוסיפים km.

- פרופיל נהג (profile.html, רק לדני): coord/build.py כותב ws/people_all.json, ואז python3 ws/profile_build.py <safety_full.json> -> profile/profile.bin. מקור הקוד: /home/claude/profile/app.js + assemble.py.

- השתלמות שנתית בקצב"ת: אחרי coord/build.py מריצים python3 ws/kbt_ann.py ואז מצפינים שוב את kbt/data.json. הכללים ב-ws/annual.py = העתק של annual() ב-coord/logic.js (לעדכן את שניהם יחד).

- תעודות משוב חודשיות (zip של DriverEvaluation PDF): מחלצים רק את נהגי המרחב, מפענחים עם safety/pdfparse.py ושומרים ב-ws/evhist.json לפי חודש. add_extra.py מוסיף v.evm; safety.html מציג פילוח לפי החודש שנבחר; פרופיל נהג מציג את כל החודשים.

- תיקיית הדרייב לעדכונים: "קצבת – עדכונים" (id 1VOAMIIZBpSxfC3iBAxYkhBnXM2sc2w-6). דני מעלה לשם או ישירות לצ׳אט.

- דשבורד ראש סניף (head.html, צפייה בלבד): python3 /home/claude/headdash/build.py <safety_full.json> אחרי coord/build.py. סיסמאות ראשי הסניפים ב-/home/claude/headdash/passwords.json (לא בריפו). סיסמת קצב"ת פותחת את כל הסניפים.

- יציאות לאירועים: python3 ws/events.py <דוח יציאה לאירועים.xlsx> -> ws/events.json (ראש צוות באמבולנס/רכב, כל רוכב באופנוע/אופניים).
- סייפטי מתחילת השנה: python3 ws/year.py <דוח תקופתי מרוכז 01/01-...> -> ws/year.json (ק"מ אמיתי + כלים חשודים).
- סדר: kbt/build -> changes -> safety chain (add_extra) -> coord/build -> kbt_ann -> encrypt kbt -> profile_build -> headdash/build.
- תאונה שלא בזמן נהיגה (לא בנסיעה / נפילה בחניה / מיטה / עובר אורח) לא נכנסת למדד הסיכון.
