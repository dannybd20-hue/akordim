/* "מי מחובר עכשיו": כל דף פתוח מדווח לסקריפט הקניות בגוגל פעם ב-45 שניות (רק כשהדף מוצג).
   נשלחים: מספר מכשיר אקראי, האפליקציה הפתוחה, שם המכשיר (אם נבחר), סוג המכשיר ועם איזו סיסמה נכנסו.
   את הפירוט הסקריפט מחזיר רק למי שנכנס עם הסיסמה הראשית; כל השאר מקבלים רק מספרים.
   מכשיר שלא דיווח 100 שניות לא נספר. */
/* שימוש פעיל באתר: מעדכן את "נכנס לאחרונה" במכשיר, כדי שלא תתבקש סיסמה/אצבע לפני 30 דקות בלי שימוש */
(function(){
  const touch=()=>{try{if(document.visibilityState!=='hidden'&&sessionStorage.getItem('hub_access')&&localStorage.getItem('hub_grace'))localStorage.setItem('hub_last',String(Date.now()))}catch(e){}};
  touch();document.addEventListener('visibilitychange',touch);setInterval(touch,60000);
  let lt=0;document.addEventListener('pointerdown',()=>{const n=Date.now();if(n-lt>20000){lt=n;touch()}},true);
})();
(function(){
  const URL='https://script.google.com/macros/s/AKfycbw_ZAnKnbqY_G0pRA186ylvFoUOpEVtL9rHYEDJGtfmcX2eYlAzIIamDschjgnKCXtuXw/exec';
  const lg=k=>{try{return localStorage.getItem(k)||''}catch(e){return''}};
  const sg=k=>{try{return sessionStorage.getItem(k)||''}catch(e){return''}};
  let id=lg('dbd_device');
  if(!id){id=Math.random().toString(36).slice(2,12)+Date.now().toString(36);try{localStorage.setItem('dbd_device',id)}catch(e){}}
  let since=+sg('dbd_since');if(!since){since=Date.now();try{sessionStorage.setItem('dbd_since',since)}catch(e){}}
  const ua=navigator.userAgent;
  const dev=/iPhone/.test(ua)?'אייפון':/iPad/.test(ua)?'אייפד':/Android/.test(ua)?(/Mobile/.test(ua)?'טלפון אנדרואיד':'טאבלט אנדרואיד'):/Windows/.test(ua)?'מחשב Windows':/Mac/.test(ua)?'מחשב Mac':'מחשב';
  const ROLE={chords:'אקורדים',maaser:'מעשר',tromot:'תרומות',shopping:'קניות',forms:'טפסים',game:'משחק חי',meds:'תרופות'};
  function role(){let A=[];try{A=JSON.parse(sg('hub_access'))||[]}catch(e){}return A.length>=4?'ראשית':A.map(a=>ROLE[a]||a).join(', ')}
  window.dbdPresence=function(page,onCounts){
    const send=leave=>JSON.stringify({app:'presence',id,page,leave:!!leave,n:lg('dbd_name')||lg('shop_me'),r:role(),d:dev,s:since,admin:sg('hub_admin')});
    function ping(){
      if(document.visibilityState==='hidden')return;
      fetch(URL,{method:'POST',body:send()}).then(r=>r.json()).then(r=>{if(r&&r.ok&&onCounts)onCounts(r,id)}).catch(()=>{});
    }
    ping();setInterval(ping,45000);
    window.dbdPing=ping;
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')ping();
      else try{navigator.sendBeacon(URL,send(true))}catch(e){}
    });
  };
})();
