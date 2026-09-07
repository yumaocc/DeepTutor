import {MarkdownIt, parser, type ASTNode} from 'react-native-markdown-display';
// These plugins only tokenize Markdown. Rendering is entirely native.
const texmath = require('markdown-it-texmath');
const footnote = require('markdown-it-footnote');
const tasks = require('markdown-it-task-lists');
const engine = require('../rich/generated/native-engine');
export const normalize: (content: string) => string = engine.normalize;
export const mathSvg: (
  tex: string,
  display: boolean,
) => {xml: string; width: number; height: number} = engine.mathSvg;
export interface HighlightNode {
  type: string;
  value?: string;
  properties?: {className?: string[]};
  children?: HighlightNode[];
}
export const highlight: (code: string, language: string) => HighlightNode[] =
  engine.highlight;
const createParser = () => {
  const instance = new MarkdownIt({html: false, linkify: true, breaks: false})
    .use(footnote)
    .use(tasks);
  instance.core.ruler.after(
    'footnote_tail',
    'native_footnote_blocks',
    state => {
      // The RN renderer groups inline tokens; footnote containers must be blocks.
      for (const token of state.tokens) {
        if (/^footnote_(block_open|block_close|open|close)$/.test(token.type)) {
          token.block = true;
        }
      }
    },
  );
  return instance;
};
const plain = createParser();
const math = createParser().use(texmath, {
  delimiters: 'dollars',
  engine: {renderToString: () => ''},
});
export function nativeAST(content: string): ASTNode[] {
  const normalized = normalize(content);
  // The library accepts a pre-parsed AST. Stable keys keep streamed blocks mounted.
  let ast: ASTNode[] = [];
  parser(
    normalized,
    ((nodes: ASTNode[]) => {
      ast = nodes;
      return null;
    }) as never,
    engine.hasMarkdownMath(normalized) ? math : plain,
  );
  const assignKeys = (nodes: ASTNode[], path: string) =>
    nodes.forEach((node, index) => {
      node.key = `${path}.${index}:${node.type}`;
      assignKeys(node.children, node.key);
    });
  assignKeys(ast, 'md');
  return ast;
}
