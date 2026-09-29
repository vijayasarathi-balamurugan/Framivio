const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'app/src/main/assets/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app/src/main/assets/app.js'),'utf8');
test('HTML IDs are unique and static JS selectors exist',()=>{const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);assert.equal(ids.length,new Set(ids).size);const dynamic=Array.from(app.matchAll(/\bid="([a-zA-Z][a-zA-Z0-9-]*)"/g),m=>m[1]);const all=new Set([...ids,...dynamic]);for(const m of app.matchAll(/\$\('#([a-zA-Z][a-zA-Z0-9-]*)'\)/g))assert.ok(all.has(m[1]),'Missing element #'+m[1]);});
test('offline assets do not load remote code, fonts or images',()=>{assert.ok(html.includes("script-src 'self'"));assert.ok(!/https?:\/\//.test(html));assert.ok(!/fetch\(|XMLHttpRequest|WebSocket/.test(app));});
test('manifest uses selected-file access and blocks plaintext traffic',()=>{const manifest=fs.readFileSync(path.join(root,'app/src/main/AndroidManifest.xml'),'utf8');assert.ok(!/READ_MEDIA_|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|ACCESS_FINE_LOCATION|RECORD_AUDIO/.test(manifest));assert.ok(manifest.includes('android:usesCleartextTraffic="false"'));assert.ok(manifest.includes('android:allowBackup="false"'));});
test('release gate cannot silently use debug signing',()=>{const gradle=fs.readFileSync(path.join(root,'app/build.gradle'),'utf8');assert.ok(gradle.includes("tasks.register('validateReleaseConfig')"));assert.ok(!gradle.includes('signingConfig signingConfigs.debug'));assert.ok(gradle.includes("name == 'preReleaseBuild'"));assert.ok(gradle.includes('targetSdk 36'));});
test('standalone preview scripts preserve production code and parse',()=>{require('../scripts/bundle-preview.cjs');const preview=fs.readFileSync(path.join(root,'PREVIEW.html'),'utf8');const scripts=Array.from(preview.matchAll(/<script>([\s\S]*?)<\/script>/g),m=>m[1]);assert.equal(scripts.length,3);const {Script}=require('node:vm');for(const script of scripts)new Script(script);assert.equal(scripts[2],app);});

test('preset modal has an independent accessible close button',()=>{assert.ok(html.includes('id="modal-x"'));assert.ok(html.includes('aria-label="Close dialog"'));assert.ok(app.includes("$('#modal-x').addEventListener('click',()=>$('#modal').close())"));});
test('quality labels exactly match encoding values',()=>{const select=html.match(/id="quality">([\s\S]*?)<\/select>/)[1];const options=Array.from(select.matchAll(/value="([^"]+)">([^<]+)/g),m=>[Number(m[1]),m[2]]);assert.deepEqual(options,[[1,'High · 100%'],[.8,'Medium · 80%'],[.6,'Small · 60%']]);assert.ok(app.includes("$('#quality').disabled=png"));});
test('PDF and saved-image re-edit are connected to native and web actions',()=>{assert.ok(html.includes('value="pdf"'));assert.ok(app.includes('Android.savePdf'));assert.ok(app.includes('Android.editExport'));assert.ok(app.includes('data-edit='));assert.ok(app.includes("state.media"));});
