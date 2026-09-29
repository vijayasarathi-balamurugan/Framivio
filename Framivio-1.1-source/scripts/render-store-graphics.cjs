const sharp=require('sharp');
const path=require('node:path');
const dir=path.resolve(__dirname,'../store/graphics');
(async()=>{
  await sharp(path.join(dir,'icon.svg')).resize(512,512).png().toFile(path.join(dir,'icon-512.png'));
  await sharp(path.join(dir,'feature.svg')).resize(1024,500).png().toFile(path.join(dir,'feature-1024x500.png'));
  console.log('Store icon and feature graphic rendered from original vector assets. Not app screenshots.');
})().catch(e=>{console.error(e);process.exitCode=1;});
