/* ליבת אפליקציית הקניות. אותו קוד רץ גם בדף (shopping.html) וגם בסקריפט של גוגל,
   כך שכל שינוי מחושב בדיוק באותה צורה בטלפון ובענן.
   מבנה הנתונים:
     items    - רשימת הקניות: {id, name, qty, by, at, auto?, src?}
     products - מוצרים שיש בבית: {id, name, emoji, img}
     hist     - מתי כל פריט נקנה: {key: {n: שם, t: [זמנים]}}
     skip     - פריט קבוע שנמחק מהרשימה בלי שנקנה: לא להוסיף אותו שוב עד הזמן הזה */
var SHOP_DAY = 864e5;

function shopKey(n) {
  return String(n || '').replace(/[֑-ׇ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
function shopNew() { return { items: [], products: [], hist: {}, skip: {}, rev: 0 }; }
function shopFind(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return i; return -1; }
function shopHasKey(st, key) { return st.items.some(function (x) { return shopKey(x.name) === key; }); }
function shopMedian(a) {
  a = a.slice().sort(function (x, y) { return x - y; });
  var m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/* פריט נחשב קבוע אחרי 3 קניות לפחות, כשהמרווחים ביניהן דומים (סטייה עד 35%) ולפחות יום */
function shopRecurring(st, key) {
  var h = st.hist[key];
  if (!h || h.t.length < 3) return null;
  var t = h.t.slice(-7), iv = [];
  for (var i = 1; i < t.length; i++) iv.push(t[i] - t[i - 1]);
  var m = shopMedian(iv);
  if (m < SHOP_DAY) return null;
  if (shopMedian(iv.map(function (x) { return Math.abs(x - m); })) > m * 0.35) return null;
  return { key: key, name: h.n, every: m, next: t[t.length - 1] + m };
}
function shopAllRecurring(st) {
  return Object.keys(st.hist).map(function (k) { return shopRecurring(st, k); }).filter(Boolean)
    .sort(function (a, b) { return a.next - b.next; });
}

/* מוסיף לרשימה פריטים קבועים שהגיע זמנם. מחזיר את השמות שנוספו */
function shopAuto(st, now) {
  var added = [];
  shopAllRecurring(st).forEach(function (r) {
    if (now < r.next || (st.skip[r.key] && now < st.skip[r.key]) || shopHasKey(st, r.key)) return;
    st.items.push({ id: 'auto-' + r.key + '-' + Math.round(r.next), name: r.name, qty: '', by: '', at: now, auto: true });
    added.push(r.name);
  });
  return added;
}

/* מחיל פעולה אחת על הנתונים. מחזיר true אם משהו השתנה */
function shopApply(st, o, now) {
  var i, k, it, h, r;
  switch (o.type) {
    case 'add':
      k = shopKey(o.name);
      if (!k) return false;
      for (i = 0; i < st.items.length; i++) {
        if (shopKey(st.items[i].name) === k) { if (o.qty) st.items[i].qty = o.qty; return !!o.qty; }
      }
      st.items.push({ id: o.iid, name: String(o.name).trim(), qty: o.qty || '', by: o.by || '', at: now, src: o.src || '' });
      return true;
    case 'edit':
      i = shopFind(st.items, o.iid);
      if (i < 0) return false;
      if (o.name !== undefined && shopKey(o.name)) st.items[i].name = String(o.name).trim();
      if (o.qty !== undefined) st.items[i].qty = o.qty;
      return true;
    case 'bought':
      i = shopFind(st.items, o.iid);
      if (i < 0) return false;
      it = st.items.splice(i, 1)[0];
      k = shopKey(it.name);
      h = st.hist[k] || (st.hist[k] = { n: it.name, t: [] });
      h.n = it.name;
      h.t.push(now);
      if (h.t.length > 12) h.t.shift();
      delete st.skip[k];
      return true;
    case 'del':
      i = shopFind(st.items, o.iid);
      if (i < 0) return false;
      it = st.items.splice(i, 1)[0];
      if (it.auto) {
        k = shopKey(it.name);
        r = shopRecurring(st, k);
        st.skip[k] = now + (r ? r.every : 7 * SHOP_DAY);
      }
      return true;
    case 'restore': // ביטול של "נקנה"
      it = o.item;
      k = shopKey(it.name);
      if (!shopHasKey(st, k)) st.items.push(it);
      h = st.hist[k];
      if (h && h.t.length && now - h.t[h.t.length - 1] < 15 * 60e3) h.t.pop();
      return true;
    case 'forget': // להפסיק להוסיף פריט קבוע אוטומטית
      delete st.hist[o.key];
      delete st.skip[o.key];
      return true;
    case 'padd':
      if (!shopKey(o.name) || shopFind(st.products, o.pid) >= 0) return false;
      if (st.products.some(function (p) { return shopKey(p.name) === shopKey(o.name); })) return false;
      st.products.push({ id: o.pid, name: String(o.name).trim(), emoji: o.emoji || '', img: o.img || '' });
      return true;
    case 'pedit':
      i = shopFind(st.products, o.pid);
      if (i < 0) return false;
      ['name', 'emoji', 'img'].forEach(function (f) { if (o[f] !== undefined) st.products[i][f] = o[f]; });
      return true;
    case 'pdel':
      i = shopFind(st.products, o.pid);
      if (i < 0) return false;
      st.products.splice(i, 1);
      return true;
  }
  return false;
}
