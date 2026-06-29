/** Intercept in-preview nav links to sibling HTML pages (builder live preview). */

export function injectPreviewPageNavScript(html: string, pagePaths: string[]): string {
  if (pagePaths.length <= 1) return html;

  const pathsJson = JSON.stringify(pagePaths);
  const script = `<script data-niskbuild-page-nav="1">
(function(){
  var pages=${pathsJson};
  function resolve(href){
    if(!href||href.startsWith('#')||href.startsWith('mailto:')||href.startsWith('tel:')||href.startsWith('javascript:'))return null;
    try{
      var u=new URL(href,window.location.href);
      var path=u.pathname.replace(/^\\//,'');
      if(!path.endsWith('.html'))path=path.replace(/\\/?$/,'')+(path?'/index.html':'index.html');
      if(pages.indexOf(path)>=0)return path;
      if(pages.indexOf('pages/'+path)>=0)return 'pages/'+path;
    }catch(e){}
    var rel=href.split('?')[0].split('#')[0];
    if(pages.indexOf(rel)>=0)return rel;
    return null;
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest('a[href]');
    if(!a)return;
    var target=resolve(a.getAttribute('href'));
    if(!target)return;
    e.preventDefault();
    parent.postMessage({type:'niskbuild-preview-nav',path:target},'*');
  },true);
})();
</script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}</body>`);
  }
  return html + script;
}
