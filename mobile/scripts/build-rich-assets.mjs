import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, 'node_modules', path), 'utf8');
const katexCss = read('katex/dist/katex.min.css').replace(
  /url\((fonts\/[^)]+)\)/g,
  (_, path) => {
    const bytes = readFileSync(resolve(root, 'node_modules/katex/dist', path));
    const format = path.endsWith('.woff2')
      ? 'font/woff2'
      : path.endsWith('.woff')
      ? 'font/woff'
      : 'font/ttf';
    return `url(data:${format};base64,${bytes.toString('base64')})`;
  },
);
const markdown = await build({
  entryPoints: [resolve(root, 'src/chat/markdown/browser.js')],
  bundle: true,
  write: false,
  minify: true,
  platform: 'browser',
  target: 'es2020',
});
const assets = {
  markdown: markdown.outputFiles[0].text,
  echarts: read('echarts/dist/echarts.min.js'),
  chartjs: read('chart.js/dist/chart.umd.js'),
  purify: read('dompurify/dist/purify.min.js'),
  katexCss,
  mermaid: read('mermaid/dist/mermaid.min.js'),
};
mkdirSync(resolve(root, 'src/chat/rich/generated'), {recursive: true});
writeFileSync(
  resolve(root, 'src/chat/rich/generated/assets.json'),
  JSON.stringify(assets),
);
console.log('Bundled offline rich-content libraries and math fonts.');
await build({
  entryPoints: [resolve(root, 'src/chat/markdown/native-engine.js')],
  outfile: resolve(root, 'src/chat/rich/generated/native-engine.js'),
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2020',
});
