/* eslint-env browser */
// Bundled at build time; these are the same normalization functions as the Web app.
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import DOMPurify from 'dompurify';
import katex from 'katex';
import hljs from 'highlight.js/lib/common';
import {
  normalizeMarkdownForDisplay,
  stripArtifactAnnotations,
} from '../../../../web/lib/markdown-display';
import {
  hasMarkdownMath,
  processMarkdownContent,
} from '../../../../web/lib/latex';

const root = document.getElementById('root');
const send = value =>
  window.ReactNativeWebView?.postMessage(JSON.stringify(value));
const math = (raw, displayMode) =>
  katex.renderToString(raw, {
    displayMode,
    throwOnError: false,
    trust: false,
    strict: 'ignore',
  });
// Match ReactMarkdown's unified pipeline and the Web app's GFM/math/raw plugins.
const baseProcessor = unified().use(remarkParse).use(remarkGfm);
const finish = parser =>
  parser
    .use(remarkRehype, {allowDangerousHtml: true})
    .use(rehypeRaw)
    .use(rehypeKatex, {throwOnError: false, trust: false, strict: 'ignore'})
    .use(rehypeStringify);
const plainProcessor = finish(baseProcessor());
const mathProcessor = finish(baseProcessor().use(remarkMath));
let diagramSequence = 0;
let diagrams = [];
window.drawMarkdownDiagrams = async () => {
  if (!window.mermaid) {
    return;
  }
  window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    flowchart: {htmlLabels: false},
  });
  for (const {box, source, pre} of diagrams) {
    if (!box.isConnected || box.dataset.rendered) {
      continue;
    }
    box.dataset.rendered = 'true';
    try {
      const result = await window.mermaid.render(
        'mobileDiagram' + ++diagramSequence,
        source,
      );
      if (box.isConnected) {
        box.innerHTML = DOMPurify.sanitize(result.svg);
        pre.hidden = true;
        measure();
      }
    } catch {
      box.textContent = '图表生成中或语法不完整，可查看源码。';
      measure();
    }
  }
};
function measure() {
  send({
    type: 'height',
    height: Math.ceil(root.getBoundingClientRect().height) + 2,
  });
}
new ResizeObserver(measure).observe(root);
document.fonts.ready.then(measure);
window.renderMarkdown = ({content, text, background, files = []}) => {
  diagrams = [];
  document.body.style.color = text;
  document.body.style.background = background;
  try {
    const normalized = processMarkdownContent(
      normalizeMarkdownForDisplay(stripArtifactAnnotations(content)),
    );
    root.innerHTML = DOMPurify.sanitize(
      String(
        (hasMarkdownMath(normalized)
          ? mathProcessor
          : plainProcessor
        ).processSync(normalized),
      ),
      {
        ADD_TAGS: ['annotation', 'semantics'],
        ALLOWED_URI_REGEXP:
          /^(?:(?:https?|mailto|attachment):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
        FORBID_TAGS: [
          'style',
          'script',
          'iframe',
          'object',
          'embed',
          'form',
          'textarea',
          'select',
          'button',
          'video',
          'audio',
        ],
        FORBID_ATTR: ['style', 'srcset'],
      },
    );
    // KaTeX uses inline layout styles; render math again from its safe TeX annotation.
    root.querySelectorAll('.katex').forEach(node => {
      const tex = node.querySelector('annotation')?.textContent;
      if (tex) {
        node.outerHTML = math(tex, false);
      }
    });
    root.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(node => {
      node.id = node.textContent
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
    });
    root.querySelectorAll('table').forEach(node => {
      const box = document.createElement('div');
      box.className = 'table-scroll';
      node.replaceWith(box);
      box.append(node);
    });
    root.querySelectorAll('pre > code').forEach(node => {
      const language =
        (node.className.match(/language-([\w.+#-]+)/) || [])[1] || '';
      const source = node.textContent;
      const pre = node.parentElement;
      const frame = document.createElement('section');
      frame.className = 'code-block';
      const bar = document.createElement('div');
      bar.className = 'code-bar';
      const label = document.createElement('span');
      label.textContent = language || '代码';
      bar.append(label);
      const copy = document.createElement('button');
      copy.textContent = '复制';
      copy.onclick = () => send({type: 'copy', content: source});
      bar.append(copy);
      pre.replaceWith(frame);
      frame.append(bar, pre);
      if (/^(mermaid|echarts|chartjs|chart\.js|html|svg)$/.test(language)) {
        const preview = document.createElement('button');
        preview.className = 'preview';
        preview.textContent = '查看 ' + language;
        preview.onclick = () =>
          send({
            type: 'preview',
            kind: language.replace('chart.js', 'chartjs'),
            content: source,
          });
        frame.append(preview);
        // Keep incomplete streamed code readable; complete visual blocks are opened in a separate sandbox.
        // Expand vertically; only horizontal overflow belongs inside a code block.
      }
      if (language === 'mermaid') {
        const box = document.createElement('div');
        frame.insertBefore(box, pre);
        diagrams.push({box, source, pre});
      }
      if (hljs.getLanguage(language)) {
        node.innerHTML = hljs.highlight(source, {
          language,
          ignoreIllegals: true,
        }).value;
      }
    });
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const prose = [];
    while (walker.nextNode()) {
      if (
        !walker.currentNode.parentElement.closest('a,code,pre,.katex,button')
      ) {
        prose.push(walker.currentNode);
      }
    }
    for (const node of prose) {
      const names = files.filter(
        name =>
          typeof name === 'string' && name && node.textContent.includes(name),
      );
      if (!names.length) {
        continue;
      }
      let remaining = node.textContent;
      const fragment = document.createDocumentFragment();
      while (remaining) {
        const next = names
          .map(name => ({name, index: remaining.indexOf(name)}))
          .filter(item => item.index >= 0)
          .sort(
            (a, b) => a.index - b.index || b.name.length - a.name.length,
          )[0];
        if (!next) {
          fragment.append(document.createTextNode(remaining));
          break;
        }
        fragment.append(
          document.createTextNode(remaining.slice(0, next.index)),
        );
        const link = document.createElement('a');
        link.textContent = next.name;
        link.href = 'attachment:' + encodeURIComponent(next.name);
        fragment.append(link);
        remaining = remaining.slice(next.index + next.name.length);
      }
      node.replaceWith(fragment);
    }
    if (diagrams.length) {
      send({type: 'mermaid'});
    }
    root.querySelectorAll('a').forEach(node =>
      node.addEventListener('click', event => {
        event.preventDefault();
        const href = node.getAttribute('href') || '';
        if (href.startsWith('#')) {
          const target = document.getElementById(href.slice(1));
          if (target) {
            send({
              type: 'reference',
              content: (target.closest('li') || target).textContent,
            });
            return;
          }
        }
        send({type: 'link', url: href, title: node.textContent});
      }),
    );
    root.querySelectorAll('img').forEach(node => {
      node.onload = measure;
      node.onerror = () => {
        const fallback = document.createElement('span');
        fallback.textContent = node.alt || '图片加载失败';
        node.replaceWith(fallback);
        measure();
      };
    });
    measure();
  } catch (error) {
    root.textContent = content;
    measure();
  }
};
send({type: 'ready'});
