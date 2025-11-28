import React, { useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { getOffsetsWithin, rehypeHighlightRanges, CodeBlock, withHandles } from "../utils/markdownHighlightUtils.tsx";
import {HL_DEBUG } from "./KnowledgeGraph.tsx";
import { TypingIndicator } from "./TypingIndicator.tsx";
import type { HandleConfig } from './Interface.tsx';
import type { CustomNodeProps } from "./Interface.tsx";
import {
    Position
} from '@xyflow/react';
import rehypeWrapQuestion from '../markdown-plugins/rehypeWrapQuestion.ts';
import { QuestionLabel } from './QuestionLabel.tsx';


// ★ CHANGED: 核心节点组件 —— 在节点内部计算选区偏移，并通过 data.onLabelMouseUp 往外抛
const CoreMarkdownNode = React.memo(({ data, selected, id }: CustomNodeProps) => {
  console.log('选中内容', { data: data })
  // 仅包裹 Markdown 渲染区域，避免“☰”等额外文本影响偏移
  const contentRef = useRef<HTMLDivElement>(null);

  function handleMarkdownMouseUp(root: HTMLElement, customScope?: { qaIndex: number; field: 'question'|'answer' }) {
    const sel = window.getSelection?.();
    if (!sel || sel.isCollapsed) {
      if (HL_DEBUG) console.log('未选中内容', { nodeId: id, data: data });
      data.onLabelMouseUp?.(id, { ...data, selection: undefined as any });
      return;
    }
    try {
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) {
        if (HL_DEBUG) console.log('选中内容 segmentMouseUp:out-of-root', { nodeId: id });
        data.onLabelMouseUp?.(id, { ...data, selection: undefined as any });
        return;
      }

      const offsets = getOffsetsWithin(root, range);
      const selectedText = sel.toString();
      const rect = range.getBoundingClientRect();

      // 尝试从 root.dataset 读取作用域（回答块），否则使用传入 / 默认
      const scope =
        (root.dataset?.qaIndex && root.dataset?.field)
          ? { qaIndex: Number(root.dataset.qaIndex), field: root.dataset.field as 'question'|'answer' }
          : (customScope || { qaIndex: -1, field: 'answer' });

      if (!offsets) {
        if (HL_DEBUG) console.log('🪵[HL] segmentMouseUp:offsets-null', { nodeId: id, selectedText, scope });
        data.onLabelMouseUp?.(id, { ...data, selection: undefined as any, scope });
        return;
      }

      // if (HL_DEBUG) {
      //   console.log('🪵[HL] segmentMouseUp:selection', { nodeId: id, selectedText, offsets, scope });
      // }

      data.onLabelMouseUp?.(id, {
        ...data,
        selection: { text: selectedText, offsets, rect, scope }
      });
    } catch (e) {
      console.warn('🪵[HL] segmentMouseUp:exception', e);
      data.onLabelMouseUp?.(id, { ...data, selection: undefined as any });
    }
  }

  // 把高亮范围注入 rehype 插件（最后执行，保证已渲染 KaTeX）
  console.log("把高亮范围注入 rehype 插件", { nodeId: id, highlights: data.highlights });
  var dataHighlights = data.highlights;
  if (!dataHighlights) dataHighlights = [];
  var offset = 7; // 默认偏移量
  var highlightAfterOffset;
  if (data.context && data.context.length > 0) {
    // 遍历 data.highlights, 把每个 highlight 的 start 和 end 加上 highlightAfterOffset
    highlightAfterOffset = dataHighlights.map(h => ({
      ...h,
      start: h.start + offset,
      end: h.end + offset
    }));
  }
  console.log("把高亮范围调整后", { highlights: highlightAfterOffset });
  const rehypeList = [
    rehypeKatex,
    [rehypeHighlightRanges, highlightAfterOffset || []] // ✅ 传入插件 + options
  ];



  const lastQA = Array.isArray(data.context) && data.context.length > 0
    ? data.context[data.context.length - 1]
    : null;

  const answerMarkdown = lastQA?.llmResponse
    ? `## LLM回复:\n${lastQA.llmResponse}`
    : '';

    const referenceContext = data.referenceContext
      ? `> 问题背景: \n${data.referenceContext}\n`
      : '';


  return (
    <div
      className={`markdown-node ${selected ? 'markdown-node--selected' : ''}`}
      style={{  overflow: 'auto', minWidth: 200, minHeight: 100, maxWidth: 800, maxHeight: 1200 }}  // resize: 'both' 开启自定义尺寸，有 bug，调整后无法自动扩容之后的问题&连接点不会自动更新
        onClickCapture={(e) => {  //点击节点触发选中操作
          // 1) 有文本选区时，不当作“选中节点”点击
          const sel = window.getSelection?.();
          if (sel && !sel.isCollapsed) return;

          // 2) 通过数据回调把“点击节点”的意图抛给父层
          data.onNodeClick?.(id);
          }}
    >
      <span className="drag-handle__custom">☰</span>

      <div
        ref={contentRef}  //必须！！选中效果配置
        className="markdown-node__content"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}

      >
        {referenceContext && (
            <ReactMarkdown
            key={`${id}:${data.highlights?.length || 0}:${answerMarkdown.length}`}
            children={referenceContext}
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[
                        rehypeKatex,
                        // ✅ 只给“这一段回答”投喂匹配作用域的 ranges 
                        [rehypeHighlightRanges],
                    ]}
            components={{
              code: CodeBlock,
              h1: ({ node, ...props }) => (<h1 className="text-[12px] leading-[16px] font-bold mt-2 mb-0.5" {...props} />),
              h2: ({ node, ...props }) => (<h2 className="text-[10px] leading-[10px] font-semibold mt-1.8 mb-0.5" {...props} />),
              h3: ({ node, ...props }) => (<h3 className="text-[8px] leading-[8px] font-medium mt-1.5 mb-0.5" {...props} />),
              h4: ({ node, ...props }) => (<h4 className="text-[7px] leading-[8px] font-normal mt-1 mb-0.5" {...props} />),
              h5: ({ node, ...props }) => (<h5 className="text-[6px] leading-[8px] font-light mt-1 mb-0.5" {...props} />),
              h6: ({ node, ...props }) => (<h6 className="text-[5px] leading-[8px] ffont-light mt-1 mb-0.5" {...props} />),
              p:  ({ node, ...props }) => (<p className="text-[8px] leading-[12px] my-0.5" {...props} />),
              strong: ({ node, ...props }) => (<strong className="font-semibold" {...props} />),
              em: ({ node, ...props }) => (<em className="italic" {...props} />),
              a:  ({ node, ...props }) => (<a className="text-[8px] leading-[12px] underline underline-offset-2 hover:no-underline" {...props} />),
              ul: ({ node, ...props }) => (<ul className="list-disc pl-2 my-0.5" {...props} />),
              ol: ({ node, ...props }) => (<ol className="list-decimal pl-2 my-0.5" {...props} />),
              li: ({ node, ...props }) => (<li className="text-[8px] leading-[12px] my-0.5" {...props} />),
              blockquote: ({ node, ...props }) => (<blockquote className="border-l-2 border-zinc-300 pl-1 text-[7px] leading-[9px] italic text-zinc-600 my-1" {...props} />),
              hr: () => <hr className="my-1 border-zinc-200" />,
              inlineCode: ({ node, ...props }) => (<code className="text-[7px] leading-[9px] bg-zinc-100 rounded px-0.5 py-px" {...props} />),
            }}
          />
        )}
         {/* ② 分隔线（可选） */}
        {referenceContext && <hr className="my-1 border-zinc-200" />}

        {/* 遍历 context 展示全部问答 */}
        {Array.isArray(data.context) && data.context.length > 0 ? (
          data.context.map((qa, idx) => (
            <React.Fragment key={`${id}:qa:${idx}`}>
              {/* 问题：独立样式渲染 */}
              {/* 问题（带作用域标记） */}
            {qa.question && (
            <div data-qa-index={idx} data-field="question">
                <QuestionLabel text={qa.question} style={data.labelStyle?.question} />
            </div>
            )}
              {/* 分隔线（可选） */}
              {qa.question && <hr className="my-1 border-zinc-200" />}
              {/* 回答：Markdown 渲染 */}
              {/* 回答（带作用域标记） */}
                {qa.llmResponse && (
                <div 
                  onMouseUp={(e) => handleMarkdownMouseUp(e.currentTarget, { qaIndex: idx, field: 'answer' })}
                  data-qa-index={idx} data-field="answer">
                    <ReactMarkdown
                    key={`${id}:llm:${idx}:${data.highlights?.length || 0}:${qa.llmResponse.length}`}
                    children={`${qa.llmResponse}`}
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[
                        rehypeKatex,
                        // ✅ 只给“这一段回答”投喂匹配作用域的 ranges 
                        [rehypeHighlightRanges,
                        (highlightAfterOffset || [])
                            .filter(h => h?.scope?.qaIndex === (idx) && h?.scope?.field === 'answer')
                            .map(h => ({ ...h, start: h.start, end: h.end }))
                        ],
                    ]}
                    components={{
                        code: CodeBlock,
                        h1: ({ node, ...props }) => (<h1 className="text-[12px] leading-[16px] font-bold mt-2 mb-0.5" {...props} />),
                        h2: ({ node, ...props }) => (<h2 className="text-[10px] leading-[10px] font-semibold mt-1.8 mb-0.5" {...props} />),
                        h3: ({ node, ...props }) => (<h3 className="text-[8px] leading-[8px] font-medium mt-1.5 mb-0.5" {...props} />),
                        h4: ({ node, ...props }) => (<h4 className="text-[7px] leading-[8px] font-normal mt-1 mb-0.5" {...props} />),
                        h5: ({ node, ...props }) => (<h5 className="text-[6px] leading-[8px] font-light mt-1 mb-0.5" {...props} />),
                        h6: ({ node, ...props }) => (<h6 className="text-[5px] leading-[8px] ffont-light mt-1 mb-0.5" {...props} />),
                        p:  ({ node, ...props }) => (<p className="text-[8px] leading-[12px] my-0.5" {...props} />),
                        strong: ({ node, ...props }) => (<strong className="font-semibold" {...props} />),
                        em: ({ node, ...props }) => (<em className="italic" {...props} />),
                        a:  ({ node, ...props }) => (<a className="text-[8px] leading-[12px] underline underline-offset-2 hover:no-underline" {...props} />),
                        ul: ({ node, ...props }) => (<ul className="list-disc pl-2 my-0.5" {...props} />),
                        ol: ({ node, ...props }) => (<ol className="list-decimal pl-2 my-0.5" {...props} />),
                        li: ({ node, ...props }) => (<li className="text-[8px] leading-[12px] my-0.5" {...props} />),
                        blockquote: ({ node, ...props }) => (<blockquote className="border-l-2 border-zinc-300 pl-1 text-[7px] leading-[9px] italic text-zinc-600 my-1" {...props} />),
                        hr: () => <hr className="my-1 border-zinc-200" />,
                        inlineCode: ({ node, ...props }) => (<code className="text-[7px] leading-[9px] bg-zinc-100 rounded px-0.5 py-px" {...props} />),
                        }}
                    />
                </div>
                )}
            </React.Fragment>
          ))
        ) : (
          // 兼容：老节点若没有 context，则回退用原 label（避免空白）
          data.label && (
            <ReactMarkdown
              key={`${id}:fallback:${data.highlights?.length || 0}:${data.label?.length || 0}`}
              children={data.label}
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={rehypeList}
              components={{
              code: CodeBlock,
              h1: ({ node, ...props }) => (<h1 className="text-[12px] leading-[16px] font-bold mt-2 mb-0.5" {...props} />),
              h2: ({ node, ...props }) => (<h2 className="text-[10px] leading-[10px] font-semibold mt-1.8 mb-0.5" {...props} />),
              h3: ({ node, ...props }) => (<h3 className="text-[8px] leading-[8px] font-medium mt-1.5 mb-0.5" {...props} />),
              h4: ({ node, ...props }) => (<h4 className="text-[7px] leading-[8px] font-normal mt-1 mb-0.5" {...props} />),
              h5: ({ node, ...props }) => (<h5 className="text-[6px] leading-[8px] font-light mt-1 mb-0.5" {...props} />),
              h6: ({ node, ...props }) => (<h6 className="text-[5px] leading-[8px] ffont-light mt-1 mb-0.5" {...props} />),
              p:  ({ node, ...props }) => (<p className="text-[8px] leading-[12px] my-0.5" {...props} />),
              strong: ({ node, ...props }) => (<strong className="font-semibold" {...props} />),
              em: ({ node, ...props }) => (<em className="italic" {...props} />),
              a:  ({ node, ...props }) => (<a className="text-[8px] leading-[12px] underline underline-offset-2 hover:no-underline" {...props} />),
              ul: ({ node, ...props }) => (<ul className="list-disc pl-2 my-0.5" {...props} />),
              ol: ({ node, ...props }) => (<ol className="list-decimal pl-2 my-0.5" {...props} />),
              li: ({ node, ...props }) => (<li className="text-[8px] leading-[12px] my-0.5" {...props} />),
              blockquote: ({ node, ...props }) => (<blockquote className="border-l-2 border-zinc-300 pl-1 text-[7px] leading-[9px] italic text-zinc-600 my-1" {...props} />),
              hr: () => <hr className="my-1 border-zinc-200" />,
              inlineCode: ({ node, ...props }) => (<code className="text-[7px] leading-[9px] bg-zinc-100 rounded px-0.5 py-px" {...props} />),
            }}
            />
          )
        )}
      </div>

      {data.isAfterAsk && <TypingIndicator />}
    </div>
  );
});

// 定义不同类型节点的 handle 配置
const mainNodeHandles: HandleConfig[] = [
];

const branchNodeHandles: HandleConfig[] = [
  { id: "target-left", type: "target", position: Position.Left },
];
// 应用不同的 handle 配置
export const MarkdownNode = withHandles(mainNodeHandles)(CoreMarkdownNode);
export const BranchMarkdownNode = withHandles(branchNodeHandles)(CoreMarkdownNode);
