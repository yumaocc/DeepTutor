/** @jest-environment node */
const {JSDOM} = require('jsdom');
const assets = require('../src/chat/rich/generated/assets.json');
function renderer() {
  const dom = new JSDOM('<!doctype html><article id="root"></article>', {
    runScripts: 'outside-only',
  });
  const {window} = dom;
  const messages = [];
  window.ReactNativeWebView = {
    postMessage: value => messages.push(JSON.parse(value)),
  };
  window.ResizeObserver = class {
    observe() {}
  };
  window.document.fonts = {ready: Promise.resolve()};
  window.eval(assets.markdown);
  return {
    window,
    messages,
    root: window.document.getElementById('root'),
    render: (content, files = []) =>
      window.renderMarkdown({content, files, text: '#123', background: '#fff'}),
  };
}
it('renders GFM and updates the same document as streamed content grows', () => {
  const r = renderer();
  r.render(
    '## Title\n\n**bold** and *italic* and ~~deleted~~\n\n- [x] done\n- [ ] todo\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n> quote',
  );
  expect(r.root.querySelector('h2').textContent).toBe('Title');
  expect(r.root.querySelector('strong').textContent).toBe('bold');
  expect(r.root.querySelector('del').textContent).toBe('deleted');
  expect(r.root.querySelectorAll('input[type=checkbox]')).toHaveLength(2);
  expect(r.root.querySelectorAll('td')).toHaveLength(2);
  r.render('**completed**');
  expect(r.root.querySelectorAll('h2')).toHaveLength(0);
  expect(r.root.textContent.trim()).toBe('completed');
  r.window.close();
});
it('renders LaTeX before Markdown escaping, without parsing code or prices as math', () => {
  const r = renderer();
  r.render(
    'Inline \\(x_1^2\\) 和$y$相邻\n\n\\[\\frac{a}{b}\\]\n\nPrices \\$5 and \\$10.\n\n```python\nprint("$x$")\n```',
  );
  expect(r.root.querySelectorAll('.katex')).toHaveLength(3);
  expect(r.root.querySelector('.katex-display')).not.toBeNull();
  expect(r.root.querySelector('pre code').textContent).toContain('$x$');
  expect(r.root.textContent).toContain('Prices $5 and $10.');
  expect(r.root.querySelector('.hljs-built_in')).not.toBeNull();
  r.window.close();
});
it('keeps arbitrary HTML inert and sends only explicit preview/copy interactions', () => {
  const r = renderer();
  r.render(
    '<img src="x" onerror="window.evil=true"><script>window.evil=true</script><iframe src="https://example.com"></iframe>\n\n```html\n<button onclick="alert(1)">Test</button>\n```',
  );
  expect(r.window.evil).toBeUndefined();
  expect(r.root.querySelector('script,iframe,[onerror],[onclick]')).toBeNull();
  r.root.querySelector('.preview').click();
  expect(r.messages.at(-1)).toMatchObject({type: 'preview', kind: 'html'});
  r.root.querySelector('.code-bar button').click();
  expect(r.messages.at(-1)).toMatchObject({
    type: 'copy',
    content: expect.stringContaining('onclick'),
  });
  r.window.close();
});
it('uses Web normalization for unicode, citations and legacy diagram fences', () => {
  const r = renderer();
  r.render(
    '\\u4f60\\u597d\\u4e16\\u754c\n\n[CIT-1-2]\n\n```sequence\nAlice->Bob: hello\n```',
  );
  expect(r.root.textContent).toContain('你好');
  expect(r.root.querySelector('.preview').textContent).toContain('mermaid');
  r.window.close();
});

it('links known artifact filenames in prose but preserves code and sanitizes unsafe links', () => {
  const r = renderer();
  r.render(
    'Read report.pdf and `report.pdf`. [unsafe](javascript:alert%281%29)',
    ['report.pdf'],
  );
  const file = r.root.querySelector('a[href^="attachment:"]');
  expect(file.textContent).toBe('report.pdf');
  expect(r.root.querySelector('code').textContent).toBe('report.pdf');
  expect(r.root.querySelector('a[href^="javascript:"]')).toBeNull();
  file.click();
  expect(r.messages.at(-1)).toMatchObject({
    type: 'link',
    url: 'attachment:report.pdf',
  });
  r.window.close();
});
