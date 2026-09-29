// Build artifact, not a separate website: a local preview of the actual Android UI.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'app/src/main/assets');
let html=fs.readFileSync(path.join(assets,'index.html'),'utf8');
html=html.replace(/  <meta http-equiv="Content-Security-Policy"[^>]+>\n/,'');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+fs.readFileSync(path.join(assets,'style.css'),'utf8')+'</style>');
for(const name of ['core.js','pdf.js','app.js'])html=html.replace('<script src="'+name+'"></script>',()=>'<script>'+fs.readFileSync(path.join(assets,name),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
fs.writeFileSync(path.join(root,'PREVIEW.html'),html);
console.log('PREVIEW.html built from production assets. Android-only video and Google services are not simulated.');
