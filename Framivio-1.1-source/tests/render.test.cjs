const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createCanvas}=require('@napi-rs/canvas');
const sharp=require('sharp');
const {placement,clamp,markCenter}=require('../app/src/main/assets/core.js');
const source=fs.readFileSync(require.resolve('../app/src/main/assets/app.js'),'utf8');
const production=source.slice(source.indexOf('function rotatedSource('),source.indexOf('function render(){'));
function harness(){
  const elements={'#watermark':{value:''},'#mark-position':{value:'br'},'#mark-color':{value:'#ffffff'},'#mark-size':{value:'5'},'#mark-opacity':{value:'90'}};
  const state={rotation:0,flip:false,before:false,mode:'fit',bg:'solid',color:'#ed624b',x:.5,y:.5,zoom:1};
  const context={state,placement,clamp,markCenter,document:{createElement:()=>createCanvas(1,1)},$:s=>elements[s],current:()=>({type:'photo'})};
  vm.createContext(context);vm.runInContext(production,context);
  const img=createCanvas(200,100),ctx=img.getContext('2d');ctx.fillStyle='#112233';ctx.fillRect(0,0,100,100);ctx.fillStyle='#557799';ctx.fillRect(100,0,100,100);
  return {context,state,elements,img,out:createCanvas(1,1)};
}
function pixel(c,x,y){return Array.from(c.getContext('2d').getImageData(x,y,1,1).data);}
test('production renderer fills letterbox with selected background',()=>{const {context,img,out}=harness();context.draw(out,img,400,400);assert.deepEqual(pixel(out,0,0),[237,98,75,255]);assert.deepEqual(pixel(out,50,150),[17,34,51,255]);});
test('transparent background preserves alpha',()=>{const {context,state,img,out}=harness();state.bg='transparent';context.draw(out,img,400,400);assert.equal(pixel(out,0,0)[3],0);assert.equal(pixel(out,50,150)[3],255);});
test('fill crop uses subject position, no letterbox',()=>{const {context,state,img,out}=harness();state.mode='crop';state.x=0;context.draw(out,img,100,100);assert.deepEqual(pixel(out,50,50),[17,34,51,255]);state.x=1;context.draw(out,img,100,100);assert.deepEqual(pixel(out,50,50),[85,119,153,255]);});
test('rotation and flip change subject orientation',()=>{const {context,state,img,out}=harness();state.mode='crop';state.flip=true;context.draw(out,img,200,100);assert.deepEqual(pixel(out,10,10),[85,119,153,255]);state.flip=false;state.rotation=90;context.draw(out,img,100,200);assert.deepEqual(pixel(out,50,10),[17,34,51,255]);assert.deepEqual(pixel(out,50,190),[85,119,153,255]);});
test('blur fills transparent corners with source pixels',()=>{const {context,state,img,out}=harness();state.bg='blur';context.draw(out,img,400,400);assert.equal(pixel(out,30,30)[3],255);assert.notDeepEqual(pixel(out,30,30),[237,98,75,255]);});
test('watermark modifies output; empty watermark does not',()=>{const {context,elements,img,out}=harness();context.draw(out,img,400,400);const before=out.toBuffer('image/png');elements['#watermark'].value='Creator';context.draw(out,img,400,400);assert.notDeepEqual(out.toBuffer('image/png'),before);});
test('before mode ignores edits and watermark in preview only',()=>{const {context,state,elements,img,out}=harness();state.before=true;elements['#watermark'].value='test';context.draw(out,img,400,400,true);assert.equal(pixel(out,0,0)[3],0);context.draw(out,img,400,400,false);assert.deepEqual(pixel(out,0,0),[237,98,75,255]);});
test('actual PNG, JPEG and WebP encoding preserves requested dimensions, no EXIF',async()=>{const {context,img,out}=harness();context.draw(out,img,1080,1920);for(const type of ['png','jpeg','webp']){const bytes=out.toBuffer('image/'+type);const meta=await sharp(bytes).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,1920);assert.equal(meta.format,type);assert.equal(meta.exif,undefined);}});

test('manual watermark follows normalized coordinates on portrait and landscape',()=>{
 const {context,state,elements,out}=harness();elements['#watermark'].value='My brand';elements['#mark-position'].value='manual';state.markX=.3;state.markY=.65;
 for(const [w,h] of [[1080,1920],[1920,1080],[450,800]]){const box=context.markLayout(out.getContext('2d'),w,h,context.watermarkSpec());assert.ok(Math.abs(box.cx/w-.3)<1e-6);assert.ok(Math.abs(box.cy/h-.65)<1e-6);}
});
test('manual watermark is kept inside canvas boundaries',()=>{
 const {context,state,elements,out}=harness();elements['#watermark'].value='This is a long watermark';elements['#mark-position'].value='manual';
 for(const edge of [0,1]){state.markX=state.markY=edge;const b=context.markLayout(out.getContext('2d'),200,300,context.watermarkSpec());assert.ok(b.x>=-1e-6&&b.y>=-1e-6);assert.ok(b.x+b.w<=200+1e-6&&b.y+b.h<=300+1e-6);}
});
test('pointer drag moves only the watermark and release stops movement',()=>{
 const {context,state,elements,img,out}=harness();out.width=out.height=400;
 elements['#watermark'].value='My mark';const handlers={};
 const stage={addEventListener:(name,fn)=>handlers[name]=fn,getBoundingClientRect:()=>({left:20,top:10,width:200,height:200}),setPointerCapture:()=>{},classList:{add:()=>{},remove:()=>{}}};
 elements['#preview-stage']=stage;elements['#preview']=out;elements['#panel-mark']={classList:{contains:()=>true}};
 context.currentImage=img;context.render=()=>{};
 const listeners=source.slice(source.indexOf('let drag=null;'),source.indexOf("$('#file-input').addEventListener"));vm.runInContext(listeners,context);
 const event=(x,y)=>({clientX:x,clientY:y,pointerId:1,target:{closest:()=>null},preventDefault:()=>{}});
 handlers.pointerdown(event(70,90));handlers.pointermove(event(100,130));
 assert.ok(Math.abs(state.markX-.4)<1e-6&&Math.abs(state.markY-.6)<1e-6);assert.equal(state.x,.5);assert.equal(state.y,.5);
 assert.equal(elements['#mark-position'].value,'manual');handlers.pointerup();handlers.pointermove(event(160,180));assert.ok(Math.abs(state.markX-.4)<1e-6);
});
