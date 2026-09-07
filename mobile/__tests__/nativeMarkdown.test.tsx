import React from 'react';
import {describe, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import {ScrollView} from 'react-native';
import {PaperProvider} from 'react-native-paper';
import {MarkdownMessage} from '../src/chat/markdown/MarkdownMessage';
import {nativeAST, mathSvg, normalize} from '../src/chat/markdown/native';
import type {ASTNode} from 'react-native-markdown-display';
const flatten = (nodes: ASTNode[]): ASTNode[] =>
  nodes.flatMap(node => [node, ...flatten(node.children)]);
describe('native message renderer', () => {
  it('parses GFM, math, tasks and footnotes without a browser and keeps block keys stable', () => {
    const content =
      '# 标题\n\n**重点** ~~删除~~\n\n- [x] 已完成\n\n| a | b |\n|---|---|\n|1|2|\n\n公式 $x^2$\n\n$$\\frac{1}{2}$$\n\n注[^a]\n\n[^a]: 说明';
    const tree = nativeAST(content);
    const types = flatten(tree).map(n => n.type);
    expect(types).toEqual(
      expect.arrayContaining([
        'heading1',
        'strong',
        's',
        'table',
        'math_inline',
        'math_block',
        'footnote_ref',
        'footnote',
      ]),
    );
    expect(
      flatten(tree).some(n => n.content?.includes('task-list-item-checkbox')),
    ).toBe(true);
    expect(nativeAST(content + '\n\nmore')[0].key).toBe(tree[0].key);
    expect(normalize(String.raw`\(x+1\)`)).toContain('$x+1$');
  });
  it('draws real vector formula paths with finite native dimensions and caches results', () => {
    const result = mathSvg('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', true);
    expect(result.xml).toContain('<path');
    expect(result.xml).not.toContain('<foreignObject');
    expect(result.width).toBeGreaterThan(30);
    expect(result.height).toBeGreaterThan(18);
    expect(mathSvg('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', true)).toBe(result);
  });
  it('renders the end of long replies and gives nested scroll views only a horizontal axis', () => {
    const content =
      '## 标题\n\n这是一段 **原生文字**。\n\n'.repeat(35) +
      '\n|a|b|\n|-|-|\n|1|2|\n\n```python\nprint(1)\n```\n\n$$x^2$$\n\nEND_OF_REPLY';
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <PaperProvider>
          <MarkdownMessage
            content={content}
            server="https://example.test"
            preview={jest.fn()}
          />
        </PaperProvider>,
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain('END_OF_REPLY');
    expect(tree.root.findAllByType(ScrollView).length).toBeGreaterThan(0);
    for (const scroll of tree.root.findAllByType(ScrollView)) {
      expect(scroll.props.horizontal).toBe(true);
    }
    expect(JSON.stringify(tree.toJSON())).not.toMatch(/WebView/);
    act(() => tree.unmount());
  });
});
