# כלי עדכון נתונים (קצב"ת / סייפטי / בטיחות סניף)

`workspace.bin` – גיבוי מוצפן (AES-GCM, PBKDF2 600k, מבנה KB1 כמו kbt/kbt.bin) של סקריפטי הבנייה,
קבצי המקור והסיסמאות. נפתח עם סיסמת ניהול קצב"ת. אחרי פענוח: קובץ tar.gz (בתוכו עוד gzip אחד).

שחזור בסשן חדש:
1. פענוח workspace.bin עם הסיסמה → פריסה ל-/home/claude (תיקיות kbt, safety, coord, ride, acc/raw, ws).
2. ws/ מכיל את קבצי המקור האחרונים ואת pw.txt.
3. עדכון: kbt/build.py → kbt/encrypt.py → kbt/kbt.bin; safety/build.py (+pdfs.py) → safety/safety.bin;
   ride/build.py → kbt/ride.bin; coord/build.py → coord/*.bin; coord/assemble.py → coord.html.
