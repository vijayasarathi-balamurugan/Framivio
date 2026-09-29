'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const {PRESETS,clamp,size,placement,cleanName,trim,markCenter}=FitCore;
const native=typeof Android!=='undefined';
const paths={frame:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M9 8l7 4-7 4z',home:'m3 10 9-7 9 7v10H3zm6 10v-7h6v7',grid:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',folder:'M3 6h7l2 3h9v11H3z',sliders:'M4 7h16M4 17h16M8 4v6m8 4v6',image:'M3 3h18v18H3zm0 13 5-5 5 5 3-3 5 5M15 7h.01',video:'M3 5h13v14H3zm13 5 5-3v10l-5-3',arrow:'M4 12h16m-6-6 6 6-6 6',back:'M20 12H4m6-6-6 6 6 6',check:'m5 12 4 4 10-10',shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zm-4 9 3 3 5-6',instagram:'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4m9 4h.01M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',youtube:'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2m5 4 5 3-5 3z',music:'M10 17V3h5c0 4 3 5 6 5M10 17a4 3 0 1 1-4-3h4',briefcase:'M8 7V3h8v4M3 7h18v14H3zm0 6h18M10 12h4v3h-4',message:'M3 3h18v15H8l-5 3zM7 8h10M7 12h7',pin:'M8 3h8l-1 6 4 4H5l4-4zm4 10v8',search:'m16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',plus:'M12 4v16M4 12h16',reset:'M3 10a9 9 0 1 1 2 8M3 3v7h7',swap:'M3 7h18l-4-4M21 17H3l4 4',bookmark:'M6 3h12v18l-6-4-6 4z',star:'m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1z',palette:'M21 12c0-5-4-9-9-9s-9 4-9 9 4 9 9 9c3 0 1-4 4-4h2c2 0 3-2 3-5M7 10h.01M10 6h.01M15 6h.01M18 10h.01',type:'M3 5h18M12 5v16M8 21h8M3 5v3m18-3v3',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',rotate:'M4 9a8 8 0 1 1 0 8M4 3v6h6',play:'m8 4 12 8-12 8z',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',share:'M8 12 17 5M8 12l9 7M8 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M22 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0M22 20a3 3 0 1 1-6 0 3 3 0 0 1 6 0'};
function icon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paths[name]||paths.frame)+'"/></svg>';}
function icons(root=document){root.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function readStore(k,fallback){try{return JSON.parse(localStorage.getItem(k))??fallback;}catch{return fallback;}}
function persist(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{toast('Settings could not be saved: device storage is full.');}}
let state={page:'home',media:[],index:0,preset:PRESETS[0],mode:'fit',bg:'blur',color:'#f4e8d8',x:.5,y:.5,zoom:1,markX:.5,markY:.5,rotation:0,flip:false,before:false,busy:false,cancel:false,pro:false,monetized:false,price:'',favorites:readStore('favorites',[]),custom:readStore('custom',[]),filter:'All',exports:[],settings:readStore('settings',{dark:false,motion:false}),importGeneration:0};
let currentImage=null,toastTimer,renderToken=0,exportWait=null;
const allPresets=()=>[...PRESETS,...state.custom];
const current=()=>state.media[state.index];
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
$('#modal-x').addEventListener('click',()=>$('#modal').close());
function modal(title,body){$('#modal-content').innerHTML='<h2>'+escapeHTML(title)+'</h2>'+body;$('#modal-close').textContent='Got it';$('#modal-close').onclick=()=>$('#modal').close();if(!$('#modal').open)$('#modal').showModal();}
function show(page){if(state.busy){toast('Finish or cancel your export first.');return;}if(page==='editor'&&!current())return;state.page=page;$$('.page').forEach(e=>e.classList.toggle('active',e.id===page));$$('.bottom-nav button').forEach(e=>e.classList.toggle('active',e.dataset.page===page));$('.bottom-nav').style.display=page==='editor'?'none':'';$('.app-header').style.display=page==='editor'?'none':'';window.scrollTo(0,0);if(page==='library')loadLibrary();if(page==='presets')renderPresets();if(page==='editor')render();}
function needPro(){if(!state.monetized||state.pro)return false;show('settings');toast('This feature is included in the one-time Pro upgrade.');return true;}
function renderPresets(){
  const query=$('#preset-search').value.toLowerCase();
  const groups=['All','Favorites','Instagram','YouTube','TikTok','Custom'];
  $('#preset-filters').innerHTML=groups.map(g=>'<button class="'+(state.filter===g?'selected':'')+'" data-filter="'+g+'">'+g+'</button>').join('');
  const items=allPresets().filter(p=>(state.filter==='All'||state.filter==='Favorites'&&state.favorites.includes(p.id)||p.group===state.filter)&&(p.name+' '+p.group+' '+p.tag).toLowerCase().includes(query));
  $('#preset-grid').innerHTML=items.map(p=>{
    const w=p.w>=p.h?86:86*p.w/p.h,h=p.h>=p.w?86:86*p.h/p.w;
    return '<button class="preset-card" data-preset="'+p.id+'"><div class="preset-visual"><span style="width:'+w+'px;height:'+h+'px">'+(currentImage?'<canvas class="preset-thumb" data-thumb="'+p.id+'" aria-label="'+escapeHTML(p.name)+' image preview"></canvas>':p.thumb?'<img class="preset-thumb" src="'+escapeHTML(p.thumb)+'" alt="Saved preset preview">':icon(p.icon))+'</span></div><b>'+escapeHTML(p.name)+'</b><small>'+p.w+' × '+p.h+' · '+escapeHTML(p.tag)+'</small>'+(state.favorites.includes(p.id)?'<span class="preset-star">★</span>':'')+'</button>';
  }).join('')||'<p class="hint">No matching presets. Try another search.</p>';
  $('#preset-thumbnail-note').textContent=currentImage?'Your selected '+(current()?.type==='video'?'video poster':'image')+' in every canvas. Tap a thumbnail to edit.':'Select a photo to preview it in every canvas size.';
  if(currentImage){
    const comparing=state.before;state.before=false;
    try{for(const canvas of $$('.preset-thumb')){const p=allPresets().find(x=>x.id===canvas.dataset.thumb),scale=180/Math.max(p.w,p.h);draw(canvas,currentImage,Math.max(1,Math.round(p.w*scale)),Math.max(1,Math.round(p.h*scale)));}}
    finally{state.before=comparing;}
  }
}
function fillPresetSelect(){const el=$('#size-preset');el.innerHTML=allPresets().map(p=>'<option value="'+p.id+'">'+escapeHTML(p.name)+' · '+p.w+' × '+p.h+'</option>').join('')+'<option value="manual">Custom dimensions</option>';el.value=state.preset.id;}
function choosePreset(id){const p=allPresets().find(p=>p.id===id);if(!p)return;state.preset=p;$('#width').value=p.w;$('#height').value=p.h;$('#safe-zone').checked=!!p.safe;fillPresetSelect();render();}
function customPreset(useCurrent=false){if(needPro())return;modal('Save your canvas','<label>Preset name<input id="custom-name" maxlength="30" placeholder="My canvas"></label><div class="two-col"><label>Width<input id="custom-width" type="number" value="'+(useCurrent?$('#width').value:1080)+'"></label><label>Height<input id="custom-height" type="number" value="'+(useCurrent?$('#height').value:1080)+'"></label></div><p>Saved on this device. You can reuse it for any photo or video.</p>');$('#modal-close').textContent='Save preset';$('#modal-close').onclick=()=>{try{const d=size(+$('#custom-width').value,+$('#custom-height').value);const name=$('#custom-name').value.trim();if(!name)throw Error('Please give the preset a name.');if(state.custom.length>=30)throw Error('You can save up to 30 custom presets.');const p={id:'custom-'+Date.now(),name,group:'Custom',...d,icon:'frame',tag:'Custom'};if(currentImage){const thumb=document.createElement('canvas'),scale=180/Math.max(p.w,p.h);draw(thumb,currentImage,Math.max(1,Math.round(p.w*scale)),Math.max(1,Math.round(p.h*scale)));p.thumb=thumb.toDataURL('image/jpeg',.8);thumb.width=thumb.height=1;}state.custom.push(p);persist('custom',state.custom);$('#modal').close();choosePreset(p.id);renderPresets();toast('Custom preset saved.');}catch(e){toast(e.message);}};}
function pick(type){if(state.busy)return;state.importGeneration++;if(native){Android.pick(type);return;}const input=$('#file-input');input.accept=type==='video'?'video/*':'image/*';input.multiple=type!=='video';input.value='';input.click();}
async function loadImage(url){const img=new Image();img.src=url;await img.decode();return img;}
async function adoptMedia(items){if(!items.length)return;state.importGeneration++;state.media=items;state.index=0;await selectMedia(0);show('editor');}
async function selectMedia(index){state.index=index;const item=current();if(!item)return;const token=++renderToken;try{const img=await loadImage(item.type==='video'?item.poster:item.url);if(token!==renderToken)return;currentImage=img;const video=item.type==='video';$('#editor-title').textContent=video?'Video studio':'Photo studio';$('#source-info').textContent=item.name+' · '+item.w+' × '+item.h;$('#photo-style').classList.toggle('hidden',video);$('#video-style').classList.toggle('hidden',!video);$('#photo-export').classList.toggle('hidden',video);$('#video-play').classList.toggle('hidden',!video);$('#compare').classList.toggle('hidden',video);$('#export-all').closest('label').classList.toggle('hidden',video||state.media.length<2);$('#export-label').textContent=video?'Export video':state.media.length>1&&$('#export-all').checked?'Export '+state.media.length+' photos':'Export photo';$('#trim-start').value=0;$('#trim-end').value=Number(item.duration||1).toFixed(2);$('#preview-note').textContent=video?'Poster preview · play opens original':'Live preview · original untouched';$('#export-hint').textContent=native?'Saved to your gallery and Framivio exports.':'Browser preview: photo exports download to this computer. Video export requires the Android app.';$('#batch-strip').innerHTML=state.media.length>1?state.media.map((m,i)=>'<button class="batch-thumb '+(i===index?'active':'')+'" data-index="'+i+'" aria-label="Select photo '+(i+1)+'"><img alt="" src="'+escapeHTML(m.url)+'"></button>').join(''):'';render();}catch(e){toast('This file could not be decoded. Try a JPG, PNG, WebP or supported video.');}}
function rotatedSource(img){if(!state.rotation&&!state.flip)return img;const c=document.createElement('canvas'),quarter=state.rotation%180!==0;c.width=quarter?img.height:img.width;c.height=quarter?img.width:img.height;const ctx=c.getContext('2d');ctx.translate(c.width/2,c.height/2);ctx.rotate(state.rotation*Math.PI/180);ctx.scale(state.flip?-1:1,1);ctx.drawImage(img,-img.width/2,-img.height/2);return c;}
function watermarkSpec(){return {text:$('#watermark').value.trim(),position:$('#mark-position').value,x:state.markX??.5,y:state.markY??.5,color:$('#mark-color').value,size:+$('#mark-size').value,opacity:+$('#mark-opacity').value/100};}
function markLayout(ctx,w,h,mark){
  let font=Math.max(1,Math.min(w,h)*mark.size/100);
  ctx.font='600 '+font+'px Arial';
  const originalWidth=ctx.measureText(mark.text).width;
  if(originalWidth>w*.9){font*=w*.9/originalWidth;ctx.font='600 '+font+'px Arial';}
  const metric=ctx.measureText(mark.text),tw=metric.width;
  const ascent=metric.actualBoundingBoxAscent||font*.8,descent=metric.actualBoundingBoxDescent||font*.2,th=ascent+descent;
  const anchor=markCenter(mark.position,mark.x,mark.y),pad=Math.min(w,h)*.04;
  let cx=anchor.x*w,cy=anchor.y*h;
  if(mark.position!=='manual'&&mark.position!=='center'){
    cx=mark.position.endsWith('l')?pad+tw/2:w-pad-tw/2;
    cy=mark.position.startsWith('t')?pad+th/2:h-pad-th/2;
  }
  cx=clamp(cx,tw/2,w-tw/2);cy=clamp(cy,th/2,h-th/2);
  return {x:cx-tw/2,y:cy-th/2,w:tw,h:th,ascent,font,cx,cy};
}
function drawMark(ctx,w,h,mark){
  if(!mark.text)return;ctx.save();const box=markLayout(ctx,w,h,mark);
  ctx.fillStyle=mark.color;ctx.globalAlpha=mark.opacity;ctx.shadowColor='#0009';
  ctx.shadowBlur=box.font/8;ctx.shadowOffsetY=Math.max(.1,box.font/30);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText(mark.text,box.x,box.y+box.ascent);ctx.restore();
}
function draw(canvas,img,w,h,preview=false){canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{alpha:true});const video=current()?.type==='video';const src=video?img:rotatedSource(img);if(state.before&&preview){const p=placement(img.width,img.height,w,h,'fit');ctx.drawImage(img,p.x,p.y,p.w,p.h);return;}const mode=state.mode;let bg=video?'solid':state.bg;ctx.clearRect(0,0,w,h);if(bg==='solid'){ctx.fillStyle=video?'#000000':state.color;ctx.fillRect(0,0,w,h);}else if(bg==='blur'){ctx.fillStyle=state.color;ctx.fillRect(0,0,w,h);ctx.save();const p=placement(src.width,src.height,w,h,'crop');const blur=Math.max(5,Math.min(w,h)*.035);ctx.filter='blur('+blur+'px)';ctx.drawImage(src,p.x-blur*2,p.y-blur*2,p.w+blur*4,p.h+blur*4);ctx.restore();ctx.fillStyle='#00000018';ctx.fillRect(0,0,w,h);}const p=placement(src.width,src.height,w,h,mode,video ? 0.5 : state.x,video ? 0.5 : state.y,video?1:state.zoom);ctx.imageSmoothingQuality='high';ctx.drawImage(src,p.x,p.y,p.w,p.h);drawMark(ctx,w,h,watermarkSpec());if(src!==img){src.width=1;src.height=1;}}
function render(){syncExportControls();const w=+$('#width').value,h=+$('#height').value;$('#canvas-dimensions').textContent=w+' × '+h;$('#export-size').textContent=w+' × '+h;$('#canvas-label').textContent=state.preset.name;$('#safe-guide').style.display=$('#safe-zone').checked&&!state.before?'block':'none';if(!currentImage||!w||!h||w<1||h<1)return;const maxWidth=Math.min($('#editor').clientWidth||350,600),height=Math.min(380,maxWidth*h/w),width=height*w/h;$('#preview-stage').style.width=width+'px';$('#preview-stage').style.height=height+'px';const scale=Math.min(900/w,900/h,1);draw($('#preview'),currentImage,Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)),true);}
function resetEdits(){state.mode='fit';state.bg='blur';state.color='#f4e8d8';state.x=state.y=.5;state.zoom=1;state.rotation=0;state.flip=false;state.before=false;state.markX=state.markY=.5;$('#mark-position').value='br';$('#pos-x').value=$('#pos-y').value=50;$('#zoom').value=100;$('#watermark').value='';$('#bg-color').value=state.color;$('#trim-start').value=0;$('#trim-end').value=Number(current()?.duration||1).toFixed(2);$('#mute').checked=false;$$('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode==='fit'));$$('[data-bg]').forEach(b=>b.classList.toggle('selected',b.dataset.bg==='blur'));render();toast('Edits reset. Your original is unchanged.');}
function progress(message,value){$('#progress-message').textContent=message;if(value==null)$('#progress').removeAttribute('value');else $('#progress').value=value;}
function beginExport(){state.busy=true;state.cancel=false;$('#export-button').disabled=true;$('#progress-dialog').showModal();progress('Preparing your creation…',0);}
function finishExport(){state.busy=false;$('#export-button').disabled=false;if($('#progress-dialog').open)$('#progress-dialog').close();}
function blobToData(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});}
function canvasBlob(c,format,quality){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Image could not be encoded. Try a smaller canvas.')),'image/'+format,quality));}
function syncExportControls(){
  const format=$('#format').value,pdf=format==='pdf',png=format==='png',video=current()?.type==='video';
  $('#quality').disabled=png;
  $('#quality-hint').textContent=png?'PNG is lossless; a quality percentage does not apply.':'Encoding quality: High 100%, Medium 80%, Small 60%. Not a size-reduction percentage.';
  $('#pdf-hint').classList.toggle('hidden',!pdf);
  $('#export-label').textContent=video?'Export video':pdf?($('#export-all').checked&&state.media.length>1?'Export PDFs':'Export PDF'):$('#export-all').checked&&state.media.length>1?'Export '+state.media.length+' photos':'Export photo';
  $('#export-hint').textContent=pdf?(native?'Saved to Downloads/Framivio and your Exports.':'PDF downloads to this computer. Open it in a PDF viewer to scroll.'):(native?'Saved to your gallery and Framivio exports.':'Photo exports download to this computer.');
  const markMode=$('#panel-mark').classList.contains('active')&&!!$('#watermark').value.trim();
  $('#preview-stage').classList.toggle('mark-mode',markMode);
  $('#video-play').classList.toggle('hidden',!video||markMode);
}
async function pdfBlob(canvas,quality){
  const parts=[];
  for(const slice of FitPDF.slices(canvas.width,canvas.height)){
    if(state.cancel)throw Error('PDF export cancelled.');
    const page=document.createElement('canvas');page.width=slice.w;page.height=slice.h;
    const ctx=page.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,page.width,page.height);
    ctx.drawImage(canvas,0,slice.y,slice.w,slice.h,0,0,slice.w,slice.h);
    const jpeg=await canvasBlob(page,'jpeg',quality);
    parts.push({w:slice.w,h:slice.h,data:new Uint8Array(await jpeg.arrayBuffer())});page.width=page.height=1;
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  return {blob:new Blob([FitPDF.build(parts)],{type:'application/pdf'}),pages:parts.length};
}
async function exportMedia(){if(!current()||state.busy)return;let dimensions;try{dimensions=size(+$('#width').value,+$('#height').value,current().type==='video');}catch(e){toast(e.message);return;}if($('#export-all').checked&&state.media.length>1&&needPro())return;const video=current().type==='video';if(video&&!native){toast('Video export is available in the Android app, not this browser preview.');return;}if(!video&&state.bg==='transparent'&&$('#format').value==='jpeg'){$('#format').value='png';toast('Switched to PNG to preserve transparency.');}if(video){try{const cut=trim($('#trim-start').value,$('#trim-end').value,current().duration);beginExport();const config={id:current().id,...dimensions,...cut,mode:state.mode,mute:$('#mute').checked,mark:watermarkSpec()};Android.exportVideo(JSON.stringify(config));}catch(e){finishExport();toast(e.message);}return;}
  beginExport();let completed=0;
  try{
    const items=$('#export-all').checked?state.media:[current()];
    for(let i=0;i<items.length;i++){
      if(state.cancel)break;
      progress('Exporting '+(i+1)+' of '+items.length,Math.round(i/items.length*100));
      const img=await loadImage(items[i].url);if(state.cancel)break;
      const c=document.createElement('canvas');draw(c,img,dimensions.w,dimensions.h);
      const format=$('#format').value,quality=+$('#quality').value;
      const result=format==='pdf'?await pdfBlob(c,quality):{blob:await canvasBlob(c,format,quality),pages:0};
      const blob=result.blob;c.width=c.height=1;if(state.cancel)break;
      const ext=blob.type==='application/pdf'?'pdf':blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png';
      const name='Framivio_'+cleanName(items[i].name)+'_'+dimensions.w+'x'+dimensions.h+'_'+Date.now()+'.'+ext;
      const meta={name,w:dimensions.w,h:dimensions.h,mime:blob.type,pages:result.pages};
      if(native){
        const data=await blobToData(blob);if(state.cancel)break;
        await new Promise((resolve,reject)=>{exportWait={resolve,reject};if(format==='pdf')Android.savePdf(JSON.stringify(meta),data.split(',')[1]);else Android.saveImage(JSON.stringify(meta),data.split(',')[1]);});
      }else{
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();
        state.exports.unshift({id:'browser-'+Date.now(),...meta,url,size:blob.size,date:Date.now()});
      }
      completed++;await new Promise(resolve=>setTimeout(resolve,40));
    }
    finishExport();toast(state.cancel?'Export stopped. '+completed+' file(s) already saved.':completed+' file(s) exported.');
    if(completed){show('library');if(native&&!state.cancel)Android.exportFinished();}
  }catch(e){finishExport();toast((state.cancel?'Export stopped: ':'Export failed: ')+e.message+(completed?' '+completed+' file(s) were already saved.':''));}
}

function loadLibrary(){if(native)Android.listExports();else renderLibrary();}
function renderLibrary(){
  $('#library-empty').classList.toggle('hidden',state.exports.length>0);
  $('#library-grid').innerHTML=state.exports.map(item=>{
    const photo=item.mime.startsWith('image/'),pdf=item.mime==='application/pdf';
    return '<article class="export-item"><div class="export-thumb">'+(photo?'<img alt="Exported creation" src="'+escapeHTML(item.url)+'">':pdf?'<b>PDF · '+(item.pages||1)+' page(s)</b>':icon('video'))+'</div><div class="export-details"><b>'+escapeHTML(item.name)+'</b><small>'+item.w+' × '+item.h+' · '+(item.size/1024/1024).toFixed(1)+' MB</small><div class="row">'+(photo?'<button class="chip edit-again" data-edit="'+item.id+'">Edit again</button>':'')+(pdf?'<button class="chip" data-open="'+item.id+'">Open PDF</button>':'')+'<button class="chip" data-share="'+item.id+'" aria-label="Share '+escapeHTML(item.name)+'">'+icon('share')+' Share</button><button class="chip" data-delete="'+item.id+'" aria-label="Remove '+escapeHTML(item.name)+'">'+icon('trash')+'</button></div></div></article>';
  }).join('');
}
async function reopenExport(item){
  resetEdits();$('#export-all').checked=false;
  state.preset={id:'manual',name:'Saved image'};$('#width').value=item.w;$('#height').value=item.h;
  $('#size-preset').value='manual';$('#safe-zone').checked=false;
  $('#format').value=item.mime==='image/png'?'png':item.mime==='image/webp'?'webp':'jpeg';
  state.bg='transparent';$$('[data-bg]').forEach(b=>b.classList.toggle('selected',b.dataset.bg==='transparent'));
  await adoptMedia([{...item,type:'photo'}]);
  toast('Opened as a new edit. Existing text is part of the saved image; export creates a new copy.');
}

function applySettings(){document.body.classList.toggle('dark',state.settings.dark);document.body.classList.toggle('reduce-motion',state.settings.motion);$('#dark-mode').checked=state.settings.dark;$('#reduce-motion').checked=state.settings.motion;if(native)Android.setTheme(state.settings.dark);}
function updatePro(){if(!state.monetized){$('#pro-card').classList.add('hidden');return;}$('#pro-card').classList.remove('hidden');$('#purchase-button').textContent=state.pro?'Pro is active':state.price?'Unlock Pro · '+state.price:'Check Pro price';$('#purchase-button').disabled=state.pro;$('#pro-status').textContent=state.pro?'Thank you. All Pro features are unlocked.':'One-time purchase through Google Play. No subscription.';}
const actions={home:()=>show('home'),settings:()=>show('settings'),presets:()=>show('presets'),'pick-photo':()=>pick('photo'),'pick-video':()=>pick('video'),'leave-editor':()=>show('home'),reset:resetEdits,swap:()=>{const w=$('#width').value;$('#width').value=$('#height').value;$('#height').value=w;state.preset={id:'manual',name:'Custom dimensions'};$('#size-preset').value='manual';render();},'custom-preset':()=>customPreset(false),'save-preset':()=>customPreset(true),favorite:()=>{if(state.preset.id==='manual'){toast('Save this as a custom preset first.');return;}const id=state.preset.id;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];persist('favorites',state.favorites);toast(state.favorites.includes(id)?'Added to favorites.':'Removed from favorites.');},rotate:()=>{state.rotation=(state.rotation+90)%360;render();},flip:()=>{state.flip=!state.flip;render();},center:()=>{state.x=state.y=.5;state.zoom=1;$('#pos-x').value=$('#pos-y').value=50;$('#zoom').value=100;render();},compare:()=>{state.before=!state.before;render();},export:exportMedia,'cancel-export':()=>{state.cancel=true;if(current()?.type==='video'&&native)Android.cancelExport();else progress('Stopping after the current save…',null);},'preview-video':()=>{if(native)Android.openSource(current().id);else toast('Install the Android build to preview video.');},purchase:()=>{if(native)Android.purchase();else toast('Purchases are available through Google Play in the configured Android app.');},restore:()=>{if(native)Android.restore();else toast('Purchase restore is available in the Android app.');},'ad-privacy':()=>{if(native)Android.adPrivacy();else toast('No advertising is running in this preview.');},privacy:()=>modal('Your media is yours','<p>Photos and videos are processed on your device. Framivio does not upload them, require an account, or operate a media server.</p><p>Imported files are stored in the app cache. Exports are saved in the app and in your gallery. Clearing cache does not remove gallery exports.</p><p>Photo exports do not copy source EXIF or GPS tags. This does not remove visible private information, faces, or spoken information in media.</p><p>When monetization is enabled, Google advertising and billing services use the internet and may process identifiers and transaction information. Privacy choices appear where required. Core editing works offline.</p>'),help:()=>modal('A good fit in four steps','<ol><li>Choose a photo, multiple photos, or one video.</li><li>Choose a canvas size. Use Fit to keep everything or Crop to fill the frame.</li><li>Add a background or your own text watermark. The safe-zone outline is a preview aid only.</li><li>Export, then share the saved result.</li></ol><p>Photos: JPG, PNG and WebP export. Video: MP4/H.264 output, up to 1920 px per side. Keep the app open while exporting. Device codec support varies.</p><p>Batch edits apply the same placement to all selected photos. Inspect each thumbnail before exporting.</p>'),support:()=>{if(native)Android.support();else toast('Support contact is configured in the Android release.');},'clear-cache':()=>{modal('Clear imported media?','<p>This closes the current edit and removes imported temporary files. Your finished exports and gallery files are kept.</p>');$('#modal-close').textContent='Clear cache';$('#modal-close').onclick=()=>{$('#modal').close();state.media=[];currentImage=null;if(native)Android.clearCache();else toast('Preview imports cleared.');show('home');};}};
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.action){actions[b.dataset.action]?.();return;}if(b.dataset.edit){const item=state.exports.find(x=>x.id===b.dataset.edit);if(!item)return;if(native)Android.editExport(item.id);else await reopenExport(item);return;}if(b.dataset.open){const item=state.exports.find(x=>x.id===b.dataset.open);if(native)Android.openExport(item.id);else{const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener';a.click();}return;}if(b.dataset.page){show(b.dataset.page);return;}if(b.dataset.panel){$$('[data-panel]').forEach(t=>{t.classList.toggle('selected',t===b);t.setAttribute('aria-selected',String(t===b));});$$('.editor-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+b.dataset.panel));render();return;}if(b.dataset.preset){choosePreset(b.dataset.preset);if(current())show('editor');else pick('photo');return;}if(b.dataset.filter){state.filter=b.dataset.filter;renderPresets();return;}if(b.dataset.mode){state.mode=b.dataset.mode;$$('[data-mode]').forEach(x=>x.classList.toggle('selected',x===b));render();return;}if(b.dataset.bg){state.bg=b.dataset.bg;$$('[data-bg]').forEach(x=>x.classList.toggle('selected',x===b));render();return;}if(b.dataset.color){state.color=b.dataset.color;$('#bg-color').value=state.color;state.bg='solid';$$('[data-bg]').forEach(x=>x.classList.toggle('selected',x.dataset.bg==='solid'));render();return;}if(b.dataset.index!=null){await selectMedia(+b.dataset.index);return;}if(b.dataset.share){const item=state.exports.find(x=>x.id===b.dataset.share);if(native)Android.share(item.id);else{const a=document.createElement('a');a.href=item.url;a.download=item.name;a.click();}return;}if(b.dataset.delete){const id=b.dataset.delete;modal('Remove from Framivio?','<p>The gallery copy will not be deleted.</p>');$('#modal-close').textContent='Remove from app';$('#modal-close').onclick=()=>{$('#modal').close();if(native)Android.deleteExport(id);else{const item=state.exports.find(x=>x.id===id);URL.revokeObjectURL(item.url);state.exports=state.exports.filter(x=>x.id!==id);renderLibrary();}};}});
$('#size-preset').addEventListener('change',e=>{if(e.target.value==='manual')state.preset={id:'manual',name:'Custom dimensions'};else choosePreset(e.target.value);render();});
['width','height'].forEach(id=>$('#'+id).addEventListener('input',()=>{state.preset={id:'manual',name:'Custom dimensions'};$('#size-preset').value='manual';render();}));
$('#format').addEventListener('change',syncExportControls);
$('#preset-search').addEventListener('input',renderPresets);
['safe-zone','watermark','mark-position','mark-color','mark-size','mark-opacity'].forEach(id=>$('#'+id).addEventListener('input',render));
$('#bg-color').addEventListener('input',e=>{state.color=e.target.value;state.bg='solid';$$('[data-bg]').forEach(x=>x.classList.toggle('selected',x.dataset.bg==='solid'));render();});
['pos-x','pos-y','zoom'].forEach(id=>$('#'+id).addEventListener('input',e=>{state[id==='pos-x'?'x':id==='pos-y'?'y':'zoom']=+e.target.value/100;render();}));
$('#export-all').addEventListener('change',()=>$('#export-label').textContent=$('#export-all').checked?'Export '+state.media.length+' photos':'Export photo');
$('#dark-mode').addEventListener('change',e=>{state.settings.dark=e.target.checked;persist('settings',state.settings);applySettings();});
$('#reduce-motion').addEventListener('change',e=>{state.settings.motion=e.target.checked;persist('settings',state.settings);applySettings();});
$('#progress-dialog').addEventListener('cancel',e=>e.preventDefault());
let drag=null;
$('#preview-stage').addEventListener('pointerdown',e=>{
  if(!currentImage||state.before||state.busy||e.target.closest('button'))return;
  const stage=$('#preview-stage'),rect=stage.getBoundingClientRect(),canvas=$('#preview');
  const mark=watermarkSpec(),px=(e.clientX-rect.left)/rect.width,py=(e.clientY-rect.top)/rect.height;
  let hit=false,box=null;
  if(mark.text){
    box=markLayout(canvas.getContext('2d'),canvas.width,canvas.height,mark);
    const pad=12*canvas.width/rect.width;
    hit=px*canvas.width>=box.x-pad&&px*canvas.width<=box.x+box.w+pad&&py*canvas.height>=box.y-pad&&py*canvas.height<=box.y+box.h+pad;
  }
  if(mark.text&&(hit||$('#panel-mark').classList.contains('active'))){
    state.markX=hit?box.cx/canvas.width:px;state.markY=hit?box.cy/canvas.height:py;$('#mark-position').value='manual';
    drag={target:'mark',x:e.clientX,y:e.clientY,sx:state.markX,sy:state.markY};
    stage.classList.add('dragging-mark');render();
  }else{
    if(current()?.type==='video')return;
    drag={target:'photo',x:e.clientX,y:e.clientY,sx:state.x,sy:state.y};
  }
  stage.setPointerCapture(e.pointerId);e.preventDefault();
});
$('#preview-stage').addEventListener('pointermove',e=>{
  if(!drag||!currentImage)return;
  const rect=$('#preview-stage').getBoundingClientRect();
  if(drag.target==='mark'){
    state.markX=clamp(drag.sx+(e.clientX-drag.x)/rect.width,0,1);
    state.markY=clamp(drag.sy+(e.clientY-drag.y)/rect.height,0,1);render();return;
  }
  const sw=state.rotation%180?currentImage.height:currentImage.width,sh=state.rotation%180?currentImage.width:currentImage.height;
  const p=placement(sw,sh,rect.width,rect.height,state.mode,.5,.5,state.zoom),dx=rect.width-p.w,dy=rect.height-p.h;
  if(Math.abs(dx)>1)state.x=clamp(drag.sx+(e.clientX-drag.x)/dx,0,1);
  if(Math.abs(dy)>1)state.y=clamp(drag.sy+(e.clientY-drag.y)/dy,0,1);
  $('#pos-x').value=state.x*100;$('#pos-y').value=state.y*100;render();
});
['pointerup','pointercancel','lostpointercapture'].forEach(ev=>$('#preview-stage').addEventListener(ev,()=>{drag=null;$('#preview-stage').classList.remove('dragging-mark');}));

$('#file-input').addEventListener('change',async e=>{const items=[];for(const file of Array.from(e.target.files).slice(0,12)){if(!file.type.startsWith('image/')){toast('Video import and processing require the Android app.');continue;}const url=URL.createObjectURL(file);try{const img=await loadImage(url);if(img.width*img.height>24000000)throw Error('Use a photo below 24 megapixels in the browser preview.');items.push({id:'web-'+items.length,name:file.name,url,type:'photo',w:img.width,h:img.height});}catch(err){URL.revokeObjectURL(url);toast(err.message||'Unsupported image.');}}await adoptMedia(items);});
window.Framivio={onNative:async function(type,data){if(type==='reedit'){await reopenExport(data);}else if(type==='media'){await adoptMedia(data);}else if(type==='error'){if(exportWait){exportWait.reject(Error(data.message));exportWait=null;}else{finishExport();toast(data.message);}}else if(type==='imageSaved'){exportWait?.resolve(data);exportWait=null;}else if(type==='exports'){state.exports=data;renderLibrary();}else if(type==='progress'){progress(data.message||'Rendering video on your device…',data.percent);}else if(type==='videoSaved'){finishExport();toast('Video exported to your gallery.');show('library');if(native)Android.exportFinished();}else if(type==='cancelled'){finishExport();toast('Export cancelled.');}else if(type==='config'){state.pro=!!data.pro;state.monetized=!!data.monetized;state.price=data.price||'';updatePro();}else if(type==='toast'){toast(data.message);}else if(type==='cacheCleared'){toast('Imported media cache cleared.');}},back(){if(state.busy){toast('Cancel the export first.');return true;}if($('#modal').open){$('#modal').close();return true;}if(state.page!=='home'){show('home');return true;}return false;}};
icons();fillPresetSelect();renderPresets();$('#quick-presets').innerHTML=[PRESETS[0],PRESETS[3],PRESETS[5]].map(p=>'<button class="quick-preset" data-preset="'+p.id+'"><span>'+icon(p.icon)+'</span>'+escapeHTML(p.group)+'<small>'+p.w+' × '+p.h+'</small></button>').join('');applySettings();updatePro();if(native)Android.ready();window.addEventListener('resize',render);
