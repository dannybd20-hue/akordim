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
    x.fillText(t,W/2,705);
    if(o.score){x.fillStyle=OR;x.font='900 48px Heebo, Arial, sans-serif';x.fillText(o.score,W/2,785)}
    x.fillStyle='#64748b';x.font='600 28px Heebo, Arial, sans-serif';
    x.fillText(new Date().toLocaleDateString('he-IL'),W/2,850);
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
  row.append(
    b('⬇ הורדה',async()=>{const u=URL.createObjectURL(await blob());const a=document.createElement('a');a.href=u;a.download=name+'.png';document.body.append(a);a.click();a.remove()}),
    b('📤 שליחה',async()=>{try{const f=new File([await blob()],name+'.png',{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:name});else{const u=URL.createObjectURL(f);window.open(u,'_blank')}}catch(e){}}),
    b('✕ סגירה',()=>ov.remove()));
  row.lastChild.style.background='#475569';
  ov.append(c,row);ov.onclick=e=>{if(e.target===ov)ov.remove()};document.body.append(ov);
}
