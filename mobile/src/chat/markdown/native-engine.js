// Bundled for Hermes by build-rich-assets: no browser, DOM, or WebView runtime.
import {mathjax} from 'mathjax-full/js/mathjax.js';
import {TeX} from 'mathjax-full/js/input/tex.js';
import {SVG} from 'mathjax-full/js/output/svg.js';
import {liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html.js';
import 'mathjax-full/js/input/tex/ams/AmsConfiguration.js';
import 'mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js';
import {common, createLowlight} from 'lowlight';
import {
  normalizeMarkdownForDisplay,
  stripArtifactAnnotations,
} from '../../../../web/lib/markdown-display';
import {
  processMarkdownContent,
  hasMarkdownMath,
} from '../../../../web/lib/latex';
export {hasMarkdownMath};
export function normalize(content) {
  return processMarkdownContent(
    normalizeMarkdownForDisplay(stripArtifactAnnotations(content)),
  );
}
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const document = mathjax.document('', {
  InputJax: new TeX({
    packages: ['base', 'ams', 'newcommand'],
    maxBuffer: 20000,
  }),
  OutputJax: new SVG({fontCache: 'none'}),
});
const cache = new Map();
export function mathSvg(tex, display) {
  const key = `${display}:${tex}`;
  if (cache.has(key)) {
    return cache.get(key);
  }
  const node = document.convert(tex, {
    display,
    em: 18,
    ex: 9,
    containerWidth: 360,
  });
  const svg = adaptor.firstChild(node);
  const viewBox = adaptor.getAttribute(svg, 'viewBox').split(/\s+/).map(Number);
  // MathJax uses 1000 units per em. Explicit dimensions avoid ex-unit support differences.
  const result = {
    xml: adaptor.outerHTML(svg),
    width: Math.ceil((viewBox[2] * 18) / 1000),
    height: Math.ceil((viewBox[3] * 18) / 1000),
  };
  if (cache.size >= 256) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, result);
  return result;
}
const highlighter = createLowlight(common);
export function highlight(code, language) {
  return highlighter.registered(language)
    ? highlighter.highlight(language, code).children
    : [{type: 'text', value: code}];
}
