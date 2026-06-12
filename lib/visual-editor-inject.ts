/** Injects click-to-edit overlay script into preview HTML (same-origin iframe). */
export function injectVisualEditorScript(html: string): string {
  const script = `<script>
(function(){
  if (window.__niskVisualEditor) return;
  window.__niskVisualEditor = true;

  var editMode = false;
  var hoverEl = null;
  var selectedEl = null;

  function cssEscape(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
  }

  function queryBySelector(selector) {
    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  function getElementSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    if (el.id) return '#' + cssEscape(el.id);
    if (el.className && typeof el.className === 'string') {
      var classes = el.className.split(/\\s+/).filter(function(c) {
        return c && c.indexOf('nisk-visual-') !== 0;
      });
      if (classes.length) {
        return el.tagName.toLowerCase() + '.' + classes.map(cssEscape).join('.');
      }
    }
    var parent = el.parentElement;
    if (!parent) return el.tagName.toLowerCase();
    var siblings = Array.prototype.filter.call(parent.children, function(child) {
      return child.tagName === el.tagName;
    });
    var index = siblings.indexOf(el) + 1;
    return getElementSelector(parent) + ' > ' + el.tagName.toLowerCase() + ':nth-of-type(' + index + ')';
  }

  function labelForElement(el) {
    if (!el || el === document.body) return 'Page';
    if (el.id) return el.id.replace(/[-_]/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
    if (el.getAttribute('role')) return el.getAttribute('role');
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    var tag = el.tagName.toLowerCase();
    var map = {
      section: 'Section', header: 'Header', footer: 'Footer', nav: 'Nav',
      main: 'Main', article: 'Article', aside: 'Aside', button: 'Button',
      a: 'Link', img: 'Image', form: 'Form', input: 'Input', div: 'Card', span: 'Text'
    };
    return map[tag] || tag.charAt(0).toUpperCase() + tag.slice(1);
  }

  function getElementBreadcrumb(el) {
    var breadcrumb = [];
    var current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      breadcrumb.unshift(labelForElement(current));
      current = current.parentElement;
    }
    if (breadcrumb.length === 0) breadcrumb.push('Page');
    return breadcrumb;
  }

  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent') return '#000000';
    if (rgb.indexOf('#') === 0) return rgb;
    var match = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if (!match) return '#000000';
    return '#' + [match[1], match[2], match[3]].map(function(n) {
      return ('0' + parseInt(n, 10).toString(16)).slice(-2);
    }).join('');
  }

  function getComputedStyles(el) {
    var styles = window.getComputedStyle(el);
    var weight = parseInt(styles.fontWeight, 10);
    if (isNaN(weight) || weight < 500) weight = weight >= 500 && weight < 700 ? 500 : 400;
    else if (weight >= 700) weight = 700;
    return {
      backgroundColor: rgbToHex(styles.backgroundColor),
      color: rgbToHex(styles.color),
      fontSize: parseFloat(styles.fontSize) || 16,
      fontWeight: weight,
      paddingTop: parseFloat(styles.paddingTop) || 0,
      paddingRight: parseFloat(styles.paddingRight) || 0,
      paddingBottom: parseFloat(styles.paddingBottom) || 0,
      paddingLeft: parseFloat(styles.paddingLeft) || 0,
      borderRadius: parseFloat(styles.borderRadius) || 0,
      borderWidth: parseFloat(styles.borderWidth) || 0,
      borderColor: rgbToHex(styles.borderColor),
      opacity: parseFloat(styles.opacity) || 1,
      display: styles.display === 'none' ? 'none' : 'block',
    };
  }

  function applyStyles(el, patch) {
    if (!el || !patch) return;
    if (patch.backgroundColor !== undefined) el.style.backgroundColor = patch.backgroundColor;
    if (patch.color !== undefined) el.style.color = patch.color;
    if (patch.fontSize !== undefined) el.style.fontSize = patch.fontSize + 'px';
    if (patch.fontWeight !== undefined) el.style.fontWeight = String(patch.fontWeight);
    if (patch.paddingTop !== undefined) el.style.paddingTop = patch.paddingTop + 'px';
    if (patch.paddingRight !== undefined) el.style.paddingRight = patch.paddingRight + 'px';
    if (patch.paddingBottom !== undefined) el.style.paddingBottom = patch.paddingBottom + 'px';
    if (patch.paddingLeft !== undefined) el.style.paddingLeft = patch.paddingLeft + 'px';
    if (patch.borderRadius !== undefined) el.style.borderRadius = patch.borderRadius + 'px';
    if (patch.borderWidth !== undefined) {
      el.style.borderWidth = patch.borderWidth + 'px';
      el.style.borderStyle = patch.borderWidth > 0 ? 'solid' : 'none';
    }
    if (patch.borderColor !== undefined) el.style.borderColor = patch.borderColor;
    if (patch.opacity !== undefined) el.style.opacity = String(patch.opacity);
    if (patch.display !== undefined) el.style.display = patch.display;
  }

  function setHover(el) {
    if (!editMode || !el || el === document.body || el === document.documentElement) return;
    if (hoverEl && hoverEl !== el) hoverEl.classList.remove('nisk-visual-hover');
    hoverEl = el;
    el.classList.add('nisk-visual-hover');
  }

  function clearHover() {
    if (hoverEl) hoverEl.classList.remove('nisk-visual-hover');
    hoverEl = null;
  }

  function selectElement(el) {
    if (!editMode || !el || el === document.body || el === document.documentElement) return;
    if (selectedEl) selectedEl.classList.remove('nisk-visual-selected');
    selectedEl = el;
    el.classList.add('nisk-visual-selected');
    window.parent.postMessage({
      type: 'niskbuild-visual-select',
      selector: getElementSelector(el),
      tagName: el.tagName.toLowerCase(),
      breadcrumb: getElementBreadcrumb(el),
      styles: getComputedStyles(el),
    }, '*');
  }

  function setEditMode(enabled) {
    editMode = !!enabled;
    document.body.style.cursor = editMode ? 'pointer' : '';
    if (!editMode) {
      clearHover();
      if (selectedEl) selectedEl.classList.remove('nisk-visual-selected');
      selectedEl = null;
    }
  }

  document.addEventListener('mouseover', function(e) {
    if (!editMode) return;
    setHover(e.target);
  }, true);

  document.addEventListener('mouseout', function() {
    if (!editMode) return;
    clearHover();
  }, true);

  document.addEventListener('click', function(e) {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    selectElement(e.target);
  }, true);

  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data.type !== 'string') return;
    if (e.data.type === 'nisk-visual-toggle') {
      setEditMode(!!e.data.enabled);
    }
    if (e.data.type === 'nisk-visual-apply') {
      var el = selectedEl || queryBySelector(e.data.selector);
      if (el) applyStyles(el, e.data.styles || {});
    }
    if (e.data.type === 'nisk-visual-clear-selection') {
      if (selectedEl) selectedEl.classList.remove('nisk-visual-selected');
      selectedEl = null;
      clearHover();
    }
  });
})();
</script>
<style>
  .nisk-visual-hover {
    outline: 2px solid #00F2FE !important;
    outline-offset: 2px !important;
    cursor: pointer !important;
  }
  .nisk-visual-selected {
    outline: 2px solid #8B5CF6 !important;
    outline-offset: 2px !important;
  }
</style>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}</body>`);
  }
  return html + script;
}

export function broadcastToPreviewIframes(message: Record<string, unknown>): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('iframe[title="Live Preview"]').forEach((frame) => {
    (frame as HTMLIFrameElement).contentWindow?.postMessage(message, '*');
  });
}
