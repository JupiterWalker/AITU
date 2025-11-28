// rehypeWrapQuestion.ts
import { visit } from 'unist-util-visit';
import type { Root, Element, Child } from 'hast';

function isH2WithText(node: any, text: string) {
  return (
    node?.type === 'element' &&
    node.tagName === 'h2' &&
    Array.isArray(node.children) &&
    node.children.some(
      (c: any) => c.type === 'text' && String(c.value || '').trim().startsWith(text)
    )
  );
}

function rehypeWrapQuestion() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index: number | null, parent: any) => {
      if (!parent || typeof index !== 'number') return;

      if (isH2WithText(node, '提问')) {
        const start = index;
        const collected: Child[] = [node];
        let cursor = start + 1;
        console.log('🪵🪵[Title Style] rehypeWrapQuestion:collecting -- parent.children', parent.children);
        while (cursor < parent.children.length) {
          const nxt = parent.children[cursor];
          if (!nxt || nxt.type !== 'element') break;
          const isHR = nxt.tagName === 'hr';
          const isNextH2 = nxt.tagName === 'h2';
          if (isHR || isNextH2) break;
          collected.push(nxt);
          cursor++;
        }
        console.log('🪵🪵[Title Style] rehypeWrapQuestion:collecting -- collected', collected);
        const wrapper: Element = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['kg-q'] },
          children: collected,
        };
        parent.children.splice(start, collected.length, wrapper);
      }
    });
  };
}

// 关键：默认导出
export default rehypeWrapQuestion;
