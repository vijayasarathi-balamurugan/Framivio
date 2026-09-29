const fs=require('node:fs');
const path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {slices,build}=require('../app/src/main/assets/pdf.js');
const dir=path.resolve(__dirname,'../test-results');fs.mkdirSync(dir,{recursive:true});
const w=600,h=2400,source=createCanvas(w,h),ctx=source.getContext('2d');
const colors=['#e75a40','#aac19b','#314c3b','#e8d6a8'];
for(let i=0;i<4;i++){ctx.fillStyle=colors[i];ctx.fillRect(0,i*600,w,600);ctx.fillStyle=i===2?'#ffffff':'#142019';ctx.font='bold 40px sans-serif';ctx.fillText('SECTION '+(i+1),45,i*600+90);ctx.font='22px sans-serif';ctx.fillText('Original rows '+i*600+'–'+((i+1)*600-1),45,i*600+135);}
const pages=slices(w,h).map(s=>{const c=createCanvas(s.w,s.h);c.getContext('2d').drawImage(source,0,s.y,s.w,s.h,0,0,s.w,s.h);return {w:s.w,h:s.h,data:c.toBuffer('image/jpeg')};});
fs.writeFileSync(path.join(dir,'scroll-test.pdf'),build(pages));
console.log('Created scroll-test.pdf with '+pages.length+' pages from actual production PDF writer.');
