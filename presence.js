/* "מי מחובר עכשיו": כל דף פתוח מדווח לסקריפט הקניות בגוגל פעם ב-45 שניות (רק כשהדף מוצג).
   המכשיר מזוהה במספר אקראי שנשמר בו, בלי שם ובלי סיסמה. מכשיר שלא דיווח 100 שניות לא נספר. */
(function(){
  const URL='https://script.google.com/macros/s/AKfycbw_ZAnKnbqY_G0pRA186ylvFoUOpEVtL9rHYEDJGtfmcX2eYlAzIIamDschjgnKCXtuXw/exec';
  let id='';
  try{id=localStorage.getItem('dbd_device')||'';if(!id){id=Math.random().toString(36).slice(2,12)+Date.now().toString(36);localStorage.setItem('dbd_device',id)}}
  catch(e){id=Math.random().toString(36).slice(2,12)}
  window.dbdPresence=function(page,onCounts){
    const send=leave=>JSON.stringify({app:'presence',id,page,leave:!!leave});
    function ping(){
      if(document.visibilityState==='hidden')return;
      fetch(URL,{method:'POST',body:send()}).then(r=>r.json()).then(r=>{if(r&&r.ok&&onCounts)onCounts(r)}).catch(()=>{});
    }
    ping();setInterval(ping,45000);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')ping();
      else try{navigator.sendBeacon(URL,send(true))}catch(e){}
    });
  };
})();
