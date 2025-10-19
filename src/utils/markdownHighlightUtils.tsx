import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
// ★ NEW: 用于遍历 HAST 的父节点链，方便跳过 code/pre/katex
import { visitParents } from 'unist-util-visit-parents';
import {
    Handle, Position
} from '@xyflow/react';

const HL_DEBUG = true; // 开关：如需禁用日志，设为 false


// ★ NEW: 选区 → 偏移 工具
export function getOffsetsWithin(rootEl: HTMLElement, range: Range) {
  if (HL_DEBUG) {
    console.groupCollapsed('🪵[HL] getOffsetsWithin:start');
    console.log('selectedText(range):', range.toString());
  }

  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
  let start = -1, end = -1, count = 0, skipped = 0;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const value = node.nodeValue || '';
    const len = value.length;

    // 跳过禁区（不把其长度计入全局计数）
    if (isForbiddenDom(node)) {
      skipped += len;
      continue;
    }

    if (node === range.startContainer) start = count + range.startOffset;
    if (node === range.endContainer)   { end = count + range.endOffset; break; }

    count += len;
  }

  if (HL_DEBUG) {
    console.log('count(allowedOnly):', count, 'skipped(forbidden):', skipped);
    console.log('calc offsets =>', { start, end });
    console.groupEnd();
  }

  if (start === -1 || end === -1 || start === end) return null;
  const offset = 7
  return { start: start-offset, end: end-offset };
}

/** className 兼容数组/字符串 */
export function hasClass(node: any, prefix: string) {
  const cls = node?.properties?.className;
  const list = Array.isArray(cls) ? cls : typeof cls === 'string' ? cls.split(/\s+/) : [];
  return list.some((c: string) => typeof c === 'string' && c.startsWith(prefix));
}

/** 跳过不该高亮的区域：code / pre / math / katex */
export function isForbidden(ancestors: any[]) {
  return ancestors.some((a) => a?.type === 'element' && (
    a.tagName === 'code' || a.tagName === 'pre' || a.tagName === 'math' ||
    hasClass(a, 'katex')
  ));
}

// ★ 新增：收集某节点容器下“允许文本”的串联结果（跳过禁区）
export function getAllowedTextFromNode(nodeId: string): { text: string } | null {
  const root = document.querySelector(`[data-id="${nodeId}"] .markdown-node__content`) as HTMLElement | null;
  if (!root) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let buf = '';
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (isForbiddenDom(n)) continue;
    buf += n.nodeValue || '';
  }
  return { text: buf };
}

// 辅助：DOM 版的禁区判断（祖先链上是否包含 code/pre/math 或 .katex）
export function isForbiddenDom(node: Node) {
  let el: Node | null = node;
  while (el) {
    if ((el as HTMLElement).classList?.contains?.('katex')) return true;
    if (el.nodeType === 1) {
      const tag = (el as HTMLElement).tagName;
      if (tag === 'CODE' || tag === 'PRE' || tag === 'MATH') return true;
    }
    el = (el as HTMLElement).parentNode as Node | null;
  }
  return false;
}

export type RangeLike = { start: number; end: number };

/** 合并 & 规范化区间 */
export function normalizeRanges(ranges: RangeLike[]) {
  const sorted = (ranges || [])
    .filter(r => r && Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start)
    .sort((a,b)=>a.start-b.start);

  const merged: RangeLike[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (!last || r.start > last.end) merged.push({ ...r });
    else last.end = Math.max(last.end, r.end);
  }
  if (HL_DEBUG) console.log('🪵[HL] normalizeRanges ->', merged);
  return merged;
}

/**
 * 安全版：两阶段处理
 * 1）遍历树，仅计算和收集需要替换的节点（不改树）
 * 2）遍历结束后，按 index 从大到小统一 splice，避免遍历过程中的结构破坏
 */
export function rehypeHighlightRanges(ranges: RangeLike[]) {
  const merged = normalizeRanges(ranges);
  return (tree: any) => {
    if (!merged.length || !tree || typeof tree !== 'object') {
      if (HL_DEBUG) console.log('🪵[HL] rehypeHighlightRanges: skip (no ranges or invalid tree)', { ranges, treeType: tree?.type });
      return;
    }

    if (HL_DEBUG) {
      console.groupCollapsed('🪵[HL] rehypeHighlightRanges:transform');
      console.log('mergedCount:', merged.length, 'treeType:', tree?.type);
    }

    // 第一次遍历：统计坐标/命中并收集 splice 操作（仍然两阶段应用）
    const opsByParent = new Map<any, Array<{ index: number; parts: any[] }>>();
    let cursor = 0;
    let visitCount = 0;
    let hitCount = 0;

    try {
      visitParents(tree, 'text', (node: any, ancestors: any[]) => {
        visitCount++;
        const parent = ancestors[ancestors.length - 1];
        const value: string = typeof node?.value === 'string' ? node.value : '';
        const forbidden = isForbidden(ancestors);
        const len = value.length;

        if (!parent || !Array.isArray(parent.children) || !len) {
          // 不计入 cursor
          return;
        }

        if (forbidden) {
          // ★ 关键：禁区文本不进入坐标系（cursor 不加上它的长度）
          return;
        }

        const nodeStart = cursor;
        const nodeEnd   = cursor + len;

        // 命中判定在“允许坐标系”上进行
        const hits = merged.filter(r => r.start < nodeEnd && r.end > nodeStart);
        if (hits.length && HL_DEBUG) {
          hitCount += hits.length;
          console.log('🪵[HL] hit', {
            nodeStart, nodeEnd, valueSample: value.slice(0, 60),
            hits: hits.map(h => ({ ...h, local: [Math.max(0,h.start-nodeStart), Math.min(len,h.end-nodeStart)] }))
          });
        }

        if (hits.length) {
          const parts: any[] = [];
          let pos = 0;
          for (const r of hits.sort((a,b)=>a.start-b.start)) {
            const s = Math.max(0, Math.min(len, r.start - nodeStart));
            const e = Math.max(0, Math.min(len, r.end   - nodeStart));
            if (e <= s) continue;
            if (s > pos) parts.push({ type: 'text', value: value.slice(pos, s) });
            parts.push({
              type: 'element', tagName: 'mark',
              properties: { className: ['md-highlight'] },
              children: [{ type: 'text', value: value.slice(s, e) }]
            });
            pos = e;
          }
          if (pos < len) parts.push({ type: 'text', value: value.slice(pos) });

          const idx = parent.children.indexOf(node);
          if (idx !== -1 && parts.length) {
            if (!opsByParent.has(parent)) opsByParent.set(parent, []);
            opsByParent.get(parent)!.push({ index: idx, parts });
          }
        }

        // ★ 关键：只有允许文本才推进 cursor
        cursor = nodeEnd;
      });

      // 第二阶段：按 index 从大到小 splice
      for (const [parent, ops] of opsByParent) {
        ops.sort((a,b) => b.index - a.index).forEach(({ index, parts }) => {
          if (Array.isArray(parent.children) && parent.children[index]) {
            parent.children.splice(index, 1, ...parts);
          }
        });
      }
    } catch (err) {
      console.error('[rehypeHighlightRanges] failed:', err);
    }

    if (HL_DEBUG) {
      console.log('🪵[HL] summary', { visitCount, hitCount, totalAllowedTextLen: cursor });
      console.groupEnd();
    }
  };
}

interface HandleConfig {
  id: string;
  type: 'source' | 'target';
  position: Position;
}



import React from 'react';
import type { CustomNodeProps } from '../components/Interface';

export function withHandles(handles: HandleConfig[]) {
  return function<T extends CustomNodeProps>(Component: React.ComponentType<T>) {
    return React.memo<T>((props) => {
      const allHandles = [...handles, ...(props.data.dynamicHandles || [])];

      return (
        <>
          {allHandles.map((handle) => (
            <Handle
              key={handle.id}
              id={handle.id}
              type={handle.type}
              position={handle.position}
              style={handle.style}
              onConnect={(params) => console.log('handle onConnect', params)}
              isConnectable={true}
            />
          ))}
          <Component {...props} />
        </>
      );
    });
  };
}

export function CodeBlock({ node, inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || '')
  return !inline && match ? (
    <SyntaxHighlighter language={match[1]} PreTag="div" {...props}>
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  ) : (
    <code className={className} {...props}>{children}</code>
  )
}
