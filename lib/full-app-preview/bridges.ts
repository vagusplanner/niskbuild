/**
 * Scripts injected into the Full App preview iframe shell.
 * Console uses the same postMessage protocol as Simple HTML preview.
 */

/** In-memory storage when sandbox omits allow-same-origin (localStorage throws). */
export const FULL_APP_STORAGE_POLYFILL = `<script data-niskbuild-preview-storage="1">
(function(){
  function mem(){
    var m=Object.create(null);
    return {
      getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null;},
      setItem:function(k,v){m[String(k)]=String(v);},
      removeItem:function(k){delete m[String(k)];},
      clear:function(){m=Object.create(null);},
      key:function(i){return Object.keys(m)[i]||null;},
      get length(){return Object.keys(m).length;}
    };
  }
  function install(name){
    try{
      var s=window[name];
      if(s){ void s.length; return; }
    }catch(e){}
    try{
      Object.defineProperty(window,name,{configurable:true,enumerable:true,get:function(){return store;}});
      var store=mem();
    }catch(e2){
      try{window[name]=mem();}catch(e3){}
    }
  }
  install('localStorage');
  install('sessionStorage');
})();
<\/script>`;

/** Early <head> console relay — mirrors lib/preview-html.ts PREVIEW_CONSOLE_CAPTURE. */
export const FULL_APP_CONSOLE_BRIDGE = `<script data-niskbuild-preview-console="1">
(function(){
  if(window.__niskbuildConsoleHooked)return;
  window.__niskbuildConsoleHooked=true;
  function ser(v){
    if(v==null)return String(v);
    var t=typeof v;
    if(t==='string')return v;
    if(t==='number'||t==='boolean'||t==='bigint'||t==='symbol'||t==='function')return String(v);
    if(typeof Error!=='undefined'&&v instanceof Error)return v.message||String(v);
    try{return JSON.stringify(v);}catch(e){try{return String(v);}catch(e2){return '[unserializable]';}}
  }
  function send(level,args,stack){
    var parts=[];
    for(var i=0;i<args.length;i++)parts.push(ser(args[i]));
    try{
      parent.postMessage({
        type:'niskbuild-preview-console',
        level:level,
        message:parts.join(' '),
        stack:stack||undefined,
        ts:Date.now()
      },'*');
    }catch(e){}
  }
  ['log','warn','error'].forEach(function(level){
    var orig=console[level];
    console[level]=function(){
      var args=Array.prototype.slice.call(arguments);
      send(level,args);
      if(typeof orig==='function'){
        try{return orig.apply(console,args);}catch(e){}
      }
    };
  });
  window.addEventListener('error',function(e){
    var msg=e&&e.message?e.message:'Uncaught error';
    var stack=(e&&e.error&&e.error.stack)||undefined;
    send('error',[msg],stack);
  });
  window.addEventListener('unhandledrejection',function(e){
    var r=e&&e.reason;
    var msg=(typeof Error!=='undefined'&&r instanceof Error)?(r.message||String(r)):ser(r);
    var stack=(typeof Error!=='undefined'&&r instanceof Error)?r.stack:undefined;
    send('error',['Unhandled rejection: '+msg],stack);
  });
})();
<\/script>`;

/**
 * Fallback nav bridge in the shell. Prefer React MemoryRouter bridge
 * (window.__niskPreviewNavigate / message listener inside the app).
 * Avoid setting location.hash on sandboxed blob iframes — Chrome blocks it.
 */
export const FULL_APP_NAV_BRIDGE = `<script data-niskbuild-preview-nav="1">
(function(){
  if(window.__niskbuildNavHooked)return;
  window.__niskbuildNavHooked=true;
  function pathNow(){
    try{
      if(typeof window.__niskPreviewPath==='string')return window.__niskPreviewPath;
      var h=location.hash||'';
      if(h.charAt(0)==='#')h=h.slice(1);
      if(!h||h.charAt(0)!=='/')h='/'+(h||'');
      return h || '/';
    }catch(e){return '/';}
  }
  function report(extra){
    try{
      parent.postMessage(Object.assign({
        type:'niskbuild-preview-history',
        canGoBack:false,
        canGoForward:false,
        path:pathNow(),
        ts:Date.now()
      },extra||{}),'*');
    }catch(e){}
  }
  window.addEventListener('message',function(e){
    var d=e&&e.data;
    if(!d||d.type!=='niskbuild-preview-nav')return;
    // React bridge (MemoryRouter) registers its own listener — if present, let it win for goto/back/forward.
    if(typeof window.__niskPreviewNavigate==='function' && (d.action==='goto'||d.action==='back'||d.action==='forward')){
      return;
    }
    if(d.action==='goto' && typeof d.path==='string' && typeof window.__niskPreviewNavigate==='function'){
      try{ window.__niskPreviewNavigate(d.path); }catch(err){}
      return;
    }
    if(d.action==='reload'){
      try{location.reload();}catch(err){}
    }
  });
  setTimeout(report,0);
  setTimeout(report,300);
})();
<\/script>`;
