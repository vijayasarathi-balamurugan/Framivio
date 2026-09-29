/* Small offline raster PDF writer. Each JPEG slice is drawn once, without distortion. */
(function(root){
  'use strict';
  const PAGE_W=595.28,PAGE_H=841.89,MARGIN=24;
  function slices(width,height){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw Error('Invalid PDF image size.');
    const maxHeight=Math.max(1,Math.floor(width*(PAGE_H-2*MARGIN)/(PAGE_W-2*MARGIN)));
    const result=[];
    for(let y=0;y<height;y+=maxHeight)result.push({y,w:width,h:Math.min(maxHeight,height-y)});
    return result;
  }
  function build(pages){
    if(!pages.length||pages.length>100)throw Error('PDF must contain 1–100 pages.');
    const enc=new TextEncoder(),chunks=[],offsets=[0];let length=0;
    const put=v=>{const b=typeof v==='string'?enc.encode(v):v;chunks.push(b);length+=b.length;};
    const object=(id,body)=>{offsets[id]=length;put(id+' 0 obj\n');body();put('\nendobj\n');};
    put('%PDF-1.4\n%Framivio\n');
    object(1,()=>put('<< /Type /Catalog /Pages 2 0 R /PageLayout /OneColumn >>'));
    object(2,()=>put('<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>'));
    pages.forEach((p,i)=>{
      if(!(p.data instanceof Uint8Array)||p.data[0]!==255||p.data[1]!==216||!p.w||!p.h)throw Error('PDF page must be a JPEG image.');
      const id=3+i*3,drawW=PAGE_W-2*MARGIN,drawH=drawW*p.h/p.w;
      if(drawH>PAGE_H-2*MARGIN+.01)throw Error('PDF page slice is too tall.');
      object(id,()=>put('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PAGE_W+' '+PAGE_H+'] /Resources << /XObject << /Image '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>'));
      object(id+1,()=>{put('<< /Type /XObject /Subtype /Image /Width '+p.w+' /Height '+p.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+p.data.length+' >>\nstream\n');put(p.data);put('\nendstream');});
      const commands='q\n'+drawW.toFixed(3)+' 0 0 '+drawH.toFixed(3)+' '+MARGIN+' '+(PAGE_H-MARGIN-drawH).toFixed(3)+' cm\n/Image Do\nQ\n';
      object(id+2,()=>put('<< /Length '+enc.encode(commands).length+' >>\nstream\n'+commands+'endstream'));
    });
    const xref=length,count=3+pages.length*3;
    put('xref\n0 '+count+'\n0000000000 65535 f \n');
    for(let i=1;i<count;i++)put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    put('trailer\n<< /Size '+count+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
    const out=new Uint8Array(length);let at=0;for(const b of chunks){out.set(b,at);at+=b.length;}return out;
  }
  const api={slices,build};if(typeof module!=='undefined')module.exports=api;else root.FitPDF=api;
})(typeof window==='undefined'?globalThis:window);
