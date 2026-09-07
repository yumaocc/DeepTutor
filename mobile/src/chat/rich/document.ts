import assets from './generated/assets.json';
import {markdownDocument} from '../markdown/document';
import type {RichContent} from './content';
const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const jsValue = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c');
export function richDocument(
  item: RichContent,
  theme: {background: string; text: string},
): string {
  if (item.kind === 'markdown') {
    const script = `window.renderMarkdown(${jsValue({
      content: item.content,
      text: theme.text,
      background: theme.background,
    })});`;
    return markdownDocument
      .replace(
        '</head>',
        '<style>html,body{overflow:auto}body{padding:16px}</style></head>',
      )
      .replace(
        '</body>',
        `<script nonce="mobile-markdown">${script}</script></body>`,
      );
  }
  const nonce = 'deeptutor-local-renderer';
  const script = (code: string) =>
    `<script nonce="${nonce}">${code.replace(
      /<\/script/gi,
      '<\\/script',
    )}</script>`;
  // Generated HTML runs in an opaque sandbox without cookies, native bridge, network or parent DOM.
  const child = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{color:${
    theme.text
  };background:${
    theme.background
  };font-family:system-ui}img,svg{max-width:100%}</style>${
    /echarts/i.test(item.content) ? script(assets.echarts) : ''
  }${/Chart\b|chart\.js/i.test(item.content) ? script(assets.chartjs) : ''}${
    item.content
  }`;
  let libraries = '';
  let render = '';
  if (item.kind === 'html') {
    render = `const frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-scripts');frame.srcdoc=${jsValue(
      child,
    )};frame.style='border:0;width:100%;height:85vh';root.append(frame);`;
  } else if (item.kind === 'echarts' || item.kind === 'chartjs') {
    libraries = script(
      item.kind === 'echarts' ? assets.echarts : assets.chartjs,
    );
    render =
      `const config=JSON.parse(${jsValue(
        item.content,
      )});root.style.height='75vh';` +
      (item.kind === 'echarts'
        ? "const chart=echarts.init(root);chart.setOption(config);window.addEventListener('resize',()=>chart.resize());"
        : "const canvas=document.createElement('canvas');root.append(canvas);new Chart(canvas,config);");
  } else if (item.kind === 'mermaid') {
    libraries = script(assets.mermaid);
    render = `mermaid.initialize({startOnLoad:false,securityLevel:'strict'});mermaid.render('diagram',${jsValue(
      item.content,
    )}).then(r=>{root.innerHTML=r.svg;}).catch(e=>{root.textContent='图表无法渲染：'+e.message;});`;
  } else if (item.kind === 'svg') {
    libraries = script(assets.purify);
    render = `root.innerHTML=DOMPurify.sanitize(${jsValue(
      item.content,
    )},{USE_PROFILES:{svg:true,svgFilters:true}});`;
  } else {
    render = `const pre=document.createElement('pre');pre.textContent=${jsValue(
      item.content,
    )};root.append(pre);`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-src about:; connect-src 'none'; form-action 'none'; base-uri 'none'"><style>body{margin:16px;font:16px/1.6 system-ui;color:${
    theme.text
  };background:${
    theme.background
  }}pre{white-space:pre-wrap;overflow-wrap:anywhere}table{border-collapse:collapse}td,th{border:1px solid;padding:6px}svg,img{max-width:100%}a{pointer-events:none}${''}</style></head><body><h2>${escape(
    item.title,
  )}</h2><div id="root"></div>${libraries}${script(
    `const root=document.getElementById('root');try{${render}}catch(e){root.textContent='内容无法渲染：'+e.message;}document.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault();});`,
  )}</body></html>`;
}
