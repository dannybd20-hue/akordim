/* ליבת אפליקציית המעשר. אותו קוד רץ גם בדף (maaser.html) וגם בסקריפט של גוגל,
   כך שכל שינוי מחושב באותה צורה בטלפון, במחשב ובענן.
   מבנה הנתונים:
     transactions - חיובי מעשר: {id, productName, buyPrice, sellPrice, profit, maaserPercent, maaserAmount, date, direct?}
     payments     - תשלומי מעשר: {id, recipient, amount, note, date, recurring?}
     recurring    - תרומות קבועות: {id, name, amount, day, active, last: 'YYYY-MM' = החודש האחרון שנרשם}
   t (היום) הוא {y, m, d} לפי שעון ישראל. */

function mzMonth(y, m) { return y + '-' + (m < 10 ? '0' : '') + m; }
function mzNext(k) { var y = +k.slice(0, 4), m = +k.slice(5) + 1; if (m > 12) { m = 1; y++; } return mzMonth(y, m); }
function mzPrev(k) { var y = +k.slice(0, 4), m = +k.slice(5) - 1; if (m < 1) { m = 12; y--; } return mzMonth(y, m); }
function mzFind(arr, id) { for (var i = 0; i < arr.length; i++) if (String(arr[i].id) === String(id)) return i; return -1; }
function mzDate(t) { return (t.d < 10 ? '0' : '') + t.d + '/' + (t.m < 10 ? '0' : '') + t.m + '/' + t.y; }
function maaserNew() { return { transactions: [], payments: [], recurring: [], rev: 0 }; }

/* נקודת ההתחלה: התרומות הקבועות, יתרת הפתיחה ועסקת המצלמות.
   החודש הנוכחי נחשב כבר "נרשם" אם היום כבר עבר, כדי לא לחייב פעמיים מה שכבר שולם */
function maaserSeed(t) {
  var st = maaserNew(), cur = mzMonth(t.y, t.m);
  st.recurring = [['הרב איתן', 2000], ['בית הכנסת המרכזי', 100], ['קהילת רמת בית שמש', 200], ['בית חב"ד', 200],
                  ['בית חב"ד (770)', 770], ['מלך עוזר', 200], ['תפארת יעקב', 200], ['שיחת השבוע', 195]]
    .map(function (x, i) { return { id: 'r' + (i + 1), name: x[0], amount: x[1], day: 10, active: true, last: t.d >= 10 ? cur : mzPrev(cur) }; });
  [['יתרת מעשר (פתיחה)', 7065], ['התקנת מצלמות', 160]].forEach(function (x, i) {
    st.transactions.push({ id: 's' + (i + 1), productName: x[0], buyPrice: 0, buyPriceNoVat: 0, sellPrice: 0, profit: 0,
                           maaserPercent: 0, maaserAmount: x[1], date: mzDate(t), direct: true });
  });
  return st;
}

/* רושם תרומה קבועה כתשלום לחודש k. המזהה קבוע לפי תרומה וחודש, כך שאי אפשר לרשום אותו חודש פעמיים */
function maaserPost(st, r, k) {
  var id = 'rp-' + r.id + '-' + k;
  if (mzFind(st.payments, id) < 0) {
    var y = +k.slice(0, 4), m = +k.slice(5);
    st.payments.push({ id: id, recipient: r.name, amount: r.amount, note: 'תרומה קבועה · חודש ' + k.slice(5) + '/' + y,
                       date: mzDate({ y: y, m: m, d: r.day }), recurring: r.id });
  }
  r.last = k;
}

/* רושם את כל החודשים שהגיע זמנם (גם חודשים שהוחמצו). מחזיר כמה נרשמו */
function maaserAuto(st, t) {
  var cur = mzMonth(t.y, t.m), n = 0;
  st.recurring.forEach(function (r) {
    if (!r.active) return;
    for (var k = mzNext(r.last); k <= cur; k = mzNext(k)) {
      if (k === cur && t.d < r.day) break;
      maaserPost(st, r, k);
      n++;
    }
  });
  return n;
}

/* מחיל פעולה אחת. מחזיר true אם משהו השתנה */
function maaserApply(st, o, t) {
  var i, r, cur = mzMonth(t.y, t.m);
  switch (o.type) {
    case 'txadd': if (mzFind(st.transactions, o.tx.id) >= 0) return false; st.transactions.push(o.tx); return true;
    case 'txdel': i = mzFind(st.transactions, o.id); if (i < 0) return false; st.transactions.splice(i, 1); return true;
    case 'payadd': if (mzFind(st.payments, o.pay.id) >= 0) return false; st.payments.push(o.pay); return true;
    case 'paydel': i = mzFind(st.payments, o.id); if (i < 0) return false; st.payments.splice(i, 1); return true;
    case 'recadd':
      if (mzFind(st.recurring, o.rec.id) >= 0) return false;
      o.rec.last = t.d >= o.rec.day ? cur : mzPrev(cur); // מתחיל מהמועד הבא
      st.recurring.push(o.rec);
      return true;
    case 'recedit':
      i = mzFind(st.recurring, o.id); if (i < 0) return false;
      ['name', 'amount', 'active', 'day'].forEach(function (f) { if (o[f] !== undefined) st.recurring[i][f] = o[f]; });
      return true;
    case 'recdel': i = mzFind(st.recurring, o.id); if (i < 0) return false; st.recurring.splice(i, 1); return true;
    case 'recnow': // לרשום עכשיו את החודש הנוכחי לכל מה שעוד לא נרשם
      r = st.recurring.filter(function (x) { return x.active && x.last < cur; });
      r.forEach(function (x) { maaserPost(st, x, cur); });
      return r.length > 0;
  }
  return false;
}
