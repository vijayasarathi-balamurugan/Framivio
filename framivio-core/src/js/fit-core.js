/* Framivio pure geometry: shared by previews, exports and regression tests. */
(function (root) {
  'use strict';
  const PRESETS = [
    { id:'ig-post', name:'Instagram Post', group:'Instagram', w:1080, h:1080, icon:'instagram', tag:'1:1' },
    { id:'ig-portrait', name:'Instagram Portrait', group:'Instagram', w:1080, h:1350, icon:'instagram', tag:'4:5' },
    { id:'ig-story', name:'Story / Reel', group:'Instagram', w:1080, h:1920, icon:'instagram', tag:'9:16', safe:true },
    { id:'yt-thumb', name:'YouTube Thumbnail', group:'YouTube', w:1280, h:720, icon:'youtube', tag:'16:9' },
    { id:'yt-short', name:'YouTube Short', group:'YouTube', w:1080, h:1920, icon:'youtube', tag:'9:16', safe:true },
    { id:'tiktok', name:'TikTok Video', group:'TikTok', w:1080, h:1920, icon:'music', tag:'9:16', safe:true },
    { id:'fb-post', name:'Facebook Landscape', group:'Facebook', w:1200, h:630, icon:'grid', tag:'1.90:1' },
    { id:'linkedin', name:'LinkedIn Post', group:'LinkedIn', w:1200, h:1200, icon:'briefcase', tag:'1:1' },
    { id:'x-post', name:'X Landscape', group:'X', w:1600, h:900, icon:'image', tag:'16:9' },
    { id:'wa-status', name:'WhatsApp Status', group:'WhatsApp', w:1080, h:1920, icon:'message', tag:'9:16', safe:true },
    { id:'pin', name:'Pinterest Pin', group:'Pinterest', w:1000, h:1500, icon:'pin', tag:'2:3' },
    { id:'square', name:'Universal Square', group:'Universal', w:1080, h:1080, icon:'frame', tag:'1:1' }
  ];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function size(w,h,video=false) {
    w=Number(w); h=Number(h);
    if (!Number.isInteger(w)||!Number.isInteger(h)||w<64||h<64||w>4096||h>4096||w*h>16777216) throw Error('Use whole numbers from 64 to 4096 pixels.');
    if (video && (w>1920||h>1920||w%2||h%2)) throw Error('Video dimensions must be even numbers, up to 1920 px per side.');
    return {w,h};
  }
  function placement(sw,sh,w,h,mode='fit',x=.5,y=.5,zoom=1) {
    if (![sw,sh,w,h].every(n=>Number.isFinite(n)&&n>0)) throw Error('Invalid image dimensions');
    if (mode !== 'fit' && mode !== 'crop') throw Error('Placement mode must be fit or crop.');
    if (![x,y,zoom].every(n=>Number.isFinite(n))) throw Error('Placement coordinates and zoom must be finite numbers.');
    const scale=(mode==='crop'?Math.max(w/sw,h/sh):Math.min(w/sw,h/sh))*clamp(zoom,1,3);
    const dw=sw*scale, dh=sh*scale;
    return {x:(w-dw)*clamp(x,0,1)||0, y:(h-dh)*clamp(y,0,1)||0, w:dw, h:dh};
  }
  function cleanName(text) { return String(text).replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]/gi,'_').slice(0,50)||'framivio'; }
  function trim(start,end,duration) {
    start=Number(start); end=Number(end); duration=Number(duration);
    if (![start,end,duration].every(Number.isFinite) || duration <= 0 || start < 0 || start >= duration || end <= start || end > duration + 0.1) {
      throw Error('Trim range must start before the video ends and finish within the video.');
    }
    const endClamped=Math.min(end,duration);
    const startMs=Math.round(start*1000), endMs=Math.round(endClamped*1000);
    if (endMs <= startMs) throw Error('Trim range is too short after millisecond rounding.');
    return {startMs,endMs};
  }
  function markCenter(position,x=.5,y=.5) {
    if(position==='manual') {
      x=Number(x); y=Number(y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw Error('Manual watermark coordinates must be finite numbers.');
      return {x:clamp(x,0,1),y:clamp(y,0,1)};
    }
    if(position==='center') return {x:.5,y:.5};
    const anchors={
      'top-left':{x:.04,y:.04}, 'top-right':{x:.96,y:.04},
      'bottom-left':{x:.04,y:.96}, 'bottom-right':{x:.96,y:.96}
    };
    if (typeof position !== 'string' || !Object.prototype.hasOwnProperty.call(anchors,position)) throw Error('Unknown watermark position.');
    return {...anchors[position]};
  }
  const api={PRESETS,clamp,size,placement,cleanName,trim,markCenter};
  if(typeof module!=='undefined') module.exports=api;
  else root.FitCore=api;
})(typeof window==='undefined'?globalThis:window);
