/* תעודת עובר: מצוירת על קנבס, אפשר להוריד כתמונה או לשלוח.
   dbdCert({name, title, score, id}) */
function dbdCert(o){
  const W=1400,H=990,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const OR='#f26a21',DK='#1e1b4b';
  const draw=logo=>{
    x.fillStyle='#fff';x.fillRect(0,0,W,H);
    const g=x.createLinearGradient(0,0,W,0);g.addColorStop(0,OR);g.addColorStop(1,'#ff9a52');
    x.fillStyle=g;x.fillRect(0,0,W,26);x.fillRect(0,H-26,W,26);
    x.strokeStyle=OR;x.lineWidth=4;x.strokeRect(46,60,W-92,H-120);
    x.strokeStyle='#ffd7bd';x.lineWidth=2;x.strokeRect(60,74,W-120,H-148);
    x.direction='rtl';x.textAlign='center';
    if(logo){const h=130,w=logo.width*h/logo.height;x.drawImage(logo,W/2-w/2,100,w,h)}
    x.fillStyle=OR;x.font='900 74px Heebo, Arial, sans-serif';x.fillText('תעודת עובר',W/2,330);
    x.fillStyle='#64748b';x.font='700 34px Heebo, Arial, sans-serif';x.fillText('מוענקת בזאת ל',W/2,410);
    x.fillStyle=DK;x.font='900 96px Heebo, Arial, sans-serif';
    let size=96,nm=String(o.name||'');while(x.measureText(nm).width>W-240&&size>40){size-=4;x.font='900 '+size+'px Heebo, Arial, sans-serif'}
    x.fillText(nm,W/2,530);
    x.strokeStyle=OR;x.lineWidth=3;x.beginPath();x.moveTo(W/2-320,560);x.lineTo(W/2+320,560);x.stroke();
    x.fillStyle='#64748b';x.font='700 34px Heebo, Arial, sans-serif';x.fillText('על עמידה מוצלחת ב',W/2,630);
    x.fillStyle=DK;x.font='900 54px Heebo, Arial, sans-serif';
    const t=String(o.title||'');let s2=54;while(x.measureText(t).width>W-220&&s2>28){s2-=2;x.font='900 '+s2+'px Heebo, Arial, sans-serif'}
    x.fillText(t,W/2,690);
    /* סוג הרכב: בוחן אופנוע = אופנוע, כל השאר = אמבולנס/רכב */
    const veh=o.veh||(/אופנוע/.test(t)?'אופנוע':'רכב/אמבולנס');
    x.font='900 40px Heebo, Arial, sans-serif';const vt='סוג רכב: '+veh,vw=x.measureText(vt).width+70;
    x.fillStyle='#fff1e8';x.strokeStyle=OR;x.lineWidth=3;x.beginPath();x.roundRect?x.roundRect(W/2-vw/2,722,vw,62,31):x.rect(W/2-vw/2,722,vw,62);x.fill();x.stroke();
    x.fillStyle=DK;x.fillText(vt,W/2,767);
    if(o.score){x.fillStyle=OR;x.font='900 46px Heebo, Arial, sans-serif';x.fillText(o.score,W/2,840)}
    x.fillStyle='#64748b';x.font='600 28px Heebo, Arial, sans-serif';
    x.fillText(new Date().toLocaleDateString('he-IL'),W/2,890);
    x.fillStyle='#94a3b8';x.font='600 22px Heebo, Arial, sans-serif';x.direction='rtl';
    x.fillText(o.id?('מזהה אימות: '+o.id):'',W/2,H-62);
    show(c,o);
  };
  const go=()=>{const im=new Image();im.onload=()=>draw(im);im.onerror=()=>draw(null);im.src='brand/uh-logo.png'};
  (document.fonts&&document.fonts.load?document.fonts.load('900 40px Heebo').catch(()=>{}):Promise.resolve()).then(go,go);
}
function show(c,o){
  const ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.8);z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:12px';
  c.style.cssText='max-width:100%;max-height:70vh;border-radius:10px;background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.4)';
  const row=document.createElement('div');row.style.cssText='display:flex;gap:10px;flex-wrap:wrap;justify-content:center';
  const b=(t,f)=>{const e=document.createElement('button');e.textContent=t;e.style.cssText='border:0;border-radius:12px;padding:12px 18px;font:inherit;font-weight:900;font-size:16px;background:#f26a21;color:#fff;cursor:pointer';e.onclick=f;return e};
  const name='תעודת עובר - '+(o.name||'');
  const blob=()=>new Promise(r=>c.toBlob(r,'image/png'));
  /* כפתור הורדה גדול ובולט בתחתית התעודה. באייפון אין הורדה ישירה, לכן נפתח חלון השמירה של המכשיר ("שמור תמונה") */
  const dl=document.createElement('button');dl.textContent='⬇ הורדה';
  dl.style.cssText='border:0;border-radius:16px;padding:16px 20px;width:min(100%,420px);font:inherit;font-weight:900;font-size:22px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#f26a21,#ff9248);box-shadow:0 8px 24px rgba(242,106,33,.45),inset 0 -3px 0 rgba(0,0,0,.15)';
  dl.onclick=async()=>{const bl=await blob();const ios=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    if(ios){try{const f=new File([bl],name+'.png',{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(e){if(e&&e.name==='AbortError')return}}
    const u=URL.createObjectURL(bl);const a=document.createElement('a');a.href=u;a.download=name+'.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)};
  row.append(
    b('📤 שליחה',async()=>{try{const f=new File([await blob()],name+'.png',{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:name});else{const u=URL.createObjectURL(f);window.open(u,'_blank')}}catch(e){}}),
    b('✕ סגירה',()=>ov.remove()));
  row.lastChild.style.background='#475569';
  row.querySelectorAll('button').forEach(e=>{e.style.padding='10px 16px';e.style.fontSize='15px'});
  ov.append(c,dl,row);ov.onclick=e=>{if(e.target===ov)ov.remove()};document.body.append(ov);
}
