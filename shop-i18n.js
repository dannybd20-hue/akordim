/* אנגלית לאפליקציית הקניות: מי שנכנס עם הקוד באנגלית (או עם ?lang=en) רואה הכול באנגלית, משמאל לימין.
   הטקסטים באפליקציה נשארים בעברית בקוד, והדף מתורגם בזמן אמת: טקסטים קבועים, הודעות, וגם שמות של מוצרים נפוצים.
   מוצר שהקלידו באנגלית נשאר כמו שהוא. עברית: ?lang=he */
(function () {
  var P = new URLSearchParams(location.search), L = P.get('lang');
  try { if (L === 'en') localStorage.setItem('shop_lang', 'en'); else if (L === 'he') localStorage.removeItem('shop_lang'); } catch (e) {}
  var EN = false;
  try { EN = localStorage.getItem('shop_lang') === 'en'; } catch (e) {}
  window.SHOP_EN = EN;
  if (!EN) return;
  document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr';
  var st = document.createElement('style');
  st.textContent = 'html[dir=ltr] .back{display:none!important} html[dir=ltr] .who button{display:none!important} html[dir=ltr] body{direction:ltr}';
  document.head.appendChild(st);

  /* טקסט שלם בלבד (השוואה מדויקת): מילים קצרות, כדי לא לפגוע במילים אחרות */
  var EXACT = {
    'קניות לבית': 'Home Shopping', 'סנכרון': 'Sync', '🧺 רשימת קניות': '🧺 Shopping list', '🏠 מוצרים בבית': '🏠 Home products',
    'סיסמה': 'Password', 'כניסה': 'Sign in', 'כמות': 'Qty', 'הוסף': 'Add', '💬 שלח בוואטסאפ': '💬 Send on WhatsApp',
    'למי לשלוח בוואטסאפ': 'Where to send on WhatsApp', '🔎 חיפוש מוצר': '🔎 Search product', 'סגור': 'Close', 'ביטול': 'Cancel', 'שמור': 'Save',
    'מוצר חדש': 'New product', 'עריכת מוצר': 'Edit product', 'מחק מוצר': 'Delete product', 'הסר תמונה': 'Remove photo',
    '📷 צלם': '📷 Camera', '🖼️ גלריה': '🖼️ Gallery', 'כמה יש בבית:': 'How many at home:', 'כמה יש בבית': 'How many at home',
    'התנתקות מהמכשיר': 'Sign out of this device', 'מי משתמש במכשיר הזה?': 'Who is using this device?', 'מי אני?': 'Who am I?',
    'מסונכרן': 'Synced', 'שגיאה בסנכרון': 'Sync error', 'סיסמה שגויה': 'Wrong password', 'נקנה': 'Bought',
    '✓ ברשימה': '✓ On the list', '🛒 לרשימה': '🛒 Add to list', '🧭 מסודר לפי מחלקות': '🧭 Sorted by aisle', '🧭 סדר לפי מחלקות': '🧭 Sort by aisle',
    'ירקות ופירות': 'Fruit & vegetables', 'חטיפים וממתקים': 'Snacks & sweets', 'לחם ומאפים': 'Bread & bakery', 'חלב וביצים': 'Dairy & eggs',
    'בשר, עוף ודגים': 'Meat, poultry & fish', 'קפואים': 'Frozen', 'משקאות': 'Drinks', 'יבשים ושימורים': 'Dry goods & canned',
    'ניקיון': 'Cleaning', 'טיפוח והיגיינה': 'Personal care', 'אחר': 'Other',
    'המוצר כבר קיים': 'This product already exists', '📷 התמונה נשמרה': '📷 Photo saved',
    'מחק בלי לסמן כנקנה': 'Delete without marking as bought', 'צלמו את המוצר': 'Take a photo of the product',
    'להפסיק להוסיף אוטומטית': 'Stop adding automatically', 'עכשיו': 'just now', 'אתמול': 'yesterday', 'יום': '1 day', 'יומיים': '2 days',
    'הגיע הזמן': 'due now', '⚙️ קבוצה (או מספר)': '⚙️ Group (or number)',
    '💬 שלח לקבוצה בוואטסאפ': '💬 Send to the WhatsApp group', '💬 שלח לקבוצה בוואטסאפ (אוטומטי)': '💬 Send to the WhatsApp group (automatic)',
    '🔁 פריטים קבועים (מתווספים לבד)': '🔁 Recurring items (added automatically)',
    'נוסף ✓ · נשלח לוואטסאפ': 'Added ✓ · sent to WhatsApp', 'נוסף לרשימה ✓': 'Added ✓',
    'אין חיבור, השינויים יישלחו כשיחזור': 'Offline, changes will be sent when the connection returns',
    'הסיסמה השתנתה, נא להיכנס שוב': 'The password was changed, please sign in again',
    'אין חיבור לאינטרנט, נסו שוב': 'No internet connection, please try again',
    '🔒 יותר מדי ניסיונות שגויים. נסה שוב בעוד רבע שעה, או עם הסיסמה הראשית': '🔒 Too many wrong attempts. Try again in 15 minutes.',
    'הרשימה ריקה. מה צריך לקנות?': 'The list is empty. What do we need to buy?',
    'מה צריך לקנות?': 'What do we need to buy?',
    ' · 💬 לא נשלח': ' · 💬 not sent'
  };
  var EX2 = {};
  /* משפטים ארוכים (החלפה בתוך טקסט) */
  var PART = [
    ['הזינו את הסיסמה המשפחתית. היא נשמרת במכשיר, כך שצריך להקליד אותה רק פעם אחת.', 'Enter the password. It is saved on this device, so you only need to type it once.'],
    ['מצב הדגמה: עדיין לא מחובר לענן, ולכן הרשימה נשמרת רק במכשיר הזה.', 'Demo mode: not connected to the cloud yet, so the list is saved on this device only.'],
    ['צלמו או בחרו תמונה של המוצר', 'Take or choose a photo of the product'],
    ['＋ ו-− משנים כמה יש בבית. כשמגיעים ל-0 המוצר נכנס לרשימת הקניות. "🛒 לרשימה" מכניס את המוצר לרשימה מיד. ✏️ לעריכה ולצילום.', '＋ and − change how many you have at home. At 0 the product goes onto the shopping list. "🛒 Add to list" puts it on the list right away. ✏️ to edit and take a photo.'],
    ['השם יופיע ליד כל פריט שתוסיפו לרשימה.', 'Your name will appear next to every item you add to the list.'],
    ['או כתבו שם אחר ולחצו Enter', 'Type your name and press Enter'],
    ['שם המוצר (למשל: חלב)', 'Product name (e.g. Milk)'],
    ['אימוג\'י במקום תמונה (לא חובה)', 'Emoji instead of a photo (optional)'],
    ['הקלד פעם אחת את הסיסמה המשפחתית של הקניות', 'Type the shopping password once'],
    ['🔁 נוסף אוטומטית · ', '🔁 added automatically · '], ['🏠 נגמר בבית · ', '🏠 ran out at home · '],
    ['לשליחה לקבוצת הוואטסאפ: השאר ריק. וואטסאפ ייפתח, והקבוצה תופיע ראשונה ברשימה.', 'To send to the WhatsApp group: leave empty.'],
    ['נוסף ✓ · וואטסאפ נפתח, לחץ שם "שלח"', 'Added ✓ · WhatsApp opened, tap "Send"'],
    ['💬 וואטסאפ ייפתח ותבחר את הקבוצה', '💬 WhatsApp will open and you choose the group'],
    ['דני · ', 'Danny · '], ['ציפי · ', 'Tzipi · '], ['הילד · ', 'Kid · '], ['ק״ג', 'kg'], ['ק"ג', 'kg'],
    ['קניות לבית', 'Home Shopping'], ['אפליקציות', 'Apps'], ['התחבר', 'Sign in']
  ];
  /* תבניות עם מספרים ושמות */
  var RULES = [
    [/לפני (\d+) דק׳/g, '$1 min ago'], [/לפני (\d+) שע׳/g, '$1 h ago'], [/לפני (\d+) ימים/g, '$1 days ago'], [/(\d+) ימים/g, '$1 days'],
    [/(^|\s·\s)עכשיו$/, '$1just now'], [/(^|\s·\s)אתמול$/, '$1yesterday'], [/יומיים/g, '2 days'], [/(^|\s)יום$/, '$11 day'],
    [/„(.+)” כבר ברשימה/, '“$1” is already on the list'], [/„(.+)” נקנה ✓/, '“$1” bought ✓'], [/„(.+)” נמחק/, '“$1” deleted'],
    [/🛒 „(.+)” נגמר ונכנס לרשימת הקניות/, '🛒 “$1” ran out and was added to the list'], [/🛒 „(.+)” נוסף לרשימת הקניות/, '🛒 “$1” added to the shopping list'],
    [/להפסיק להוסיף את „(.+)” אוטומטית\?/, 'Stop adding “$1” automatically?'], [/למחוק את „(.+)” מהמוצרים בבית\?/, 'Delete “$1” from the home products?'],
    [/^💬 נשלח לוואטסאפ: (\d+) פריטים$/, '💬 Sent to WhatsApp: $1 items'], [/^💬 וואטסאפ נפתח עם (\d+) פריטים, לחץ שם "שלח"$/, '💬 WhatsApp opened with $1 items, tap "Send"'],
    [/^💬 שלח בוואטסאפ (\d+) פריט$/, '💬 Send 1 item on WhatsApp'], [/^💬 שלח בוואטסאפ (\d+) פריטים$/, '💬 Send $1 items on WhatsApp'],
    [/ · בערך כל /, ' · about every '], [/הבא בעוד /, 'next in '], [/הגיע הזמן/, 'due now']
  ];
  var PRODUCTS = {
    'חלב': 'Milk', 'לחם': 'Bread', 'ביצים': 'Eggs', 'גבינה צהובה': 'Yellow cheese', 'קוטג׳': 'Cottage cheese', 'יוגורט': 'Yogurt', 'חמאה': 'Butter',
    'עגבניות': 'Tomatoes', 'מלפפונים': 'Cucumbers', 'בננות': 'Bananas', 'תפוחים': 'Apples', 'בצל': 'Onion', 'תפוחי אדמה': 'Potatoes', 'אורז': 'Rice',
    'פסטה': 'Pasta', 'שמן': 'Oil', 'קפה': 'Coffee', 'סוכר': 'Sugar', 'במבה': 'Bamba', 'מים': 'Water', 'נייר טואלט': 'Toilet paper', 'סבון כלים': 'Dish soap',
    'אבקת כביסה': 'Laundry powder', 'שקיות אשפה': 'Trash bags', 'גזר': 'Carrots', 'פלפל': 'Pepper', 'חסה': 'Lettuce', 'לימון': 'Lemon', 'אבוקדו': 'Avocado',
    'תפוזים': 'Oranges', 'שום': 'Garlic', 'בטטה': 'Sweet potato', 'ברוקולי': 'Broccoli', 'פטריות': 'Mushrooms', 'עוף': 'Chicken', 'בשר טחון': 'Ground meat',
    'שניצל': 'Schnitzel', 'דג': 'Fish', 'טונה': 'Tuna', 'גבינה לבנה': 'White cheese', 'שמנת': 'Cream', 'שוקו': 'Chocolate milk', 'קמח': 'Flour', 'מלח': 'Salt',
    'פתיתים': 'Couscous', 'חומוס': 'Hummus', 'טחינה': 'Tahini', 'דבש': 'Honey', 'ריבה': 'Jam', 'קורנפלקס': 'Cornflakes', 'שוקולד': 'Chocolate', 'עוגיות': 'Cookies',
    'ביסלי': 'Bisli', 'קולה': 'Cola', 'מיץ': 'Juice', 'בירה': 'Beer', 'יין': 'Wine', 'תה': 'Tea', 'גלידה': 'Ice cream', 'פיתה': 'Pita', 'חלה': 'Challah',
    'שמפו': 'Shampoo', 'משחת שיניים': 'Toothpaste', 'סבון': 'Soap', 'מגבות נייר': 'Paper towels', 'אקונומיקה': 'Bleach', 'ספוגים': 'Sponges', 'חיתולים': 'Diapers',
    'דני': 'Danny', 'ציפי': 'Tzipi', 'הילד': 'Kid', 'מגבונים': 'Wet wipes', 'תפוח': 'Apple', 'בננה': 'Banana', 'מלפפון': 'Cucumber', 'עגבנייה': 'Tomato', 'ביצה': 'Egg', 'גבינה': 'Cheese', 'נקניק': 'Salami',
    'פסטרמה': 'Pastrami', 'חזה עוף': 'Chicken breast', 'סלמון': 'Salmon', 'אגוזים': 'Nuts', 'שקדים': 'Almonds', 'קטשופ': 'Ketchup', 'מיונז': 'Mayonnaise',
    'חרדל': 'Mustard', 'רסק עגבניות': 'Tomato paste', 'שעועית': 'Beans', 'עדשים': 'Lentils', 'קוסקוס': 'Couscous', 'תירס': 'Corn', 'נענע': 'Mint',
    'פטרוזיליה': 'Parsley', 'כוסברה': 'Cilantro', 'חציל': 'Eggplant', 'קישואים': 'Zucchini', 'אבטיח': 'Watermelon', 'מלון': 'Melon', 'ענבים': 'Grapes', 'תותים': 'Strawberries'
  };
  function key(s) { return String(s).replace(/[֑-ׇ]/g, '').replace(/\s+/g, ' ').trim(); }
  Object.keys(EXACT).forEach(function (k) { EX2[key(k)] = EXACT[k]; });
  var parts = PART.slice().sort(function (a, b) { return b[0].length - a[0].length; });
  var HE = /[א-ת]/;
  function tr(s) {
    if (!s || !HE.test(s)) return s;
    var t = key(s), lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    if (EX2[t] !== undefined) return lead + EX2[t] + trail;
    if (PRODUCTS[t] !== undefined) return lead + PRODUCTS[t] + trail;
    var out = s, i, r;
    for (i = 0; i < RULES.length; i++) { r = RULES[i]; out = out.replace(r[0], r[1]); }
    for (i = 0; i < parts.length; i++) if (out.indexOf(parts[i][0]) >= 0) out = out.split(parts[i][0]).join(parts[i][1]);
    out = out.replace(/“([^”]+)”/g, function (m, n) { return '“' + (PRODUCTS[key(n)] || n) + '”'; });
    return out;
  }
  window.shopTr = tr;
  var ATTRS = ['placeholder', 'title'];
  function doNode(n) {
    if (n.nodeType === 3) { var v = n.nodeValue; if (HE.test(v)) { var w = tr(v); if (w !== v) n.nodeValue = w; } return; }
    if (n.nodeType !== 1) return;
    var tg = n.tagName; if (tg === 'SCRIPT' || tg === 'STYLE') return;
    for (var i = 0; i < ATTRS.length; i++) { var a = n.getAttribute && n.getAttribute(ATTRS[i]); if (a && HE.test(a)) { var b = tr(a); if (b !== a) n.setAttribute(ATTRS[i], b); } }
    for (var c = n.firstChild; c; c = c.nextSibling) doNode(c);
  }
  function start() {
    doNode(document.documentElement); document.title = tr(document.title);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'childList') m.addedNodes.forEach(doNode);
        else if (m.type === 'characterData') doNode(m.target);
        else if (m.type === 'attributes') doNode(m.target);
      });
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  /* חלונות קופצים (אישור והזנת טקסט) */
  var _c = window.confirm, _p = window.prompt, _a = window.alert;
  window.confirm = function (s) { return _c.call(window, tr(s)); };
  window.prompt = function (s, d) { return _p.call(window, tr(s), d); };
  window.alert = function (s) { return _a.call(window, tr(s)); };
})();
