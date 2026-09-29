const {test}=require('node:test');
const assert=require('node:assert/strict');
const {slices,build}=require('../app/src/main/assets/pdf.js');
const {createCanvas}=require('@napi-rs/canvas');
test('PDF slices cover the entire tall canvas exactly once',()=>{for(const [w,h] of [[1080,4096],[1080,1080],[64,4096],[4096,64]]){const pages=slices(w,h);assert.equal(pages[0].y,0);let cursor=0;for(const p of pages){assert.equal(p.y,cursor);cursor+=p.h;assert.equal(p.w,w);}assert.equal(cursor,h);assert.ok(pages.length>=1);}});
test('PDF cross-reference byte offsets point to actual objects',()=>{const c=createCanvas(300,300);c.getContext('2d').fillRect(0,0,300,300);const pdf=build([{w:300,h:300,data:c.toBuffer('image/jpeg')}]);const data=Buffer.from(pdf),text=data.toString('latin1');assert.ok(text.startsWith('%PDF-1.4'));assert.ok(text.includes('/PageLayout /OneColumn'));const start=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(data.subarray(start,start+4).toString(),'xref');const entries=text.slice(start).split('\n');for(let i=1;i<6;i++){const offset=Number(entries[2+i].slice(0,10));assert.ok(data.subarray(offset,offset+12).toString().startsWith(i+' 0 obj'));}});
test('empty PDFs and malformed image data fail',()=>{assert.throws(()=>build([]));assert.throws(()=>build([{w:1,h:1,data:new Uint8Array([1,2,3])}]));});
