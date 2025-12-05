// components/KnowledgeGraph.tsx
import {useCallback, useState, useRef, useEffect, useMemo, type ChangeEventHandler} from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState, Position, Panel, type ColorMode,
    useUpdateNodeInternals,
    useReactFlow
} from '@xyflow/react';
import ChatBox from './ChatBox.tsx';
import {LLMService, GraphService} from "../service.ts";
import './KnowlegeGraph.css';
import 'katex/dist/katex.min.css' // 公式样式
import {
getAllowedTextFromNode} from '../utils/markdownHighlightUtils.tsx';
import { MarkdownNode, BranchMarkdownNode } from './Nodes.tsx';
// 扩展节点运行期数据，避免 TS 对额外字段报错
import type { Node } from '@xyflow/react';
import { useTranslation } from 'react-i18next';

export const HL_DEBUG = true; // 开关：如需禁用日志，设为 false

export const initialNode = {
    id: 'root',
    type: 'markdown',
    data: {label: '💡 输入你的第一个问题'},
    position: {x: 250, y: 50},
    // draggable: false,
    selected: true,
    dragHandle: '.drag-handle__custom'
}

export const initialNodes = [
    initialNode
];

// nodeTypes 移到组件外部，避免每次渲染都新建对象
const nodeTypes = {
    'markdown': MarkdownNode,
    'branch-markdown': BranchMarkdownNode,
};

interface KnowledgeGraphProps {
  onGraphExport?: (payload: any) => void;
  onGraphImport?: (payload: any) => void;
  onRegisterApi?: (api: { exportGraph: () => any; importGraph: (payload: any) => void }) => void;
  bootstrapQuestion?: string; // 首页传入的首次问题
  prefillGraph?: { id: number; title: string; nodes: any[]; edges: any[] } | undefined;
}

export default function KnowledgeGraph({ onGraphExport, onGraphImport, onRegisterApi, bootstrapQuestion, prefillGraph }: KnowledgeGraphProps) {

  const updateNodeInternals = useUpdateNodeInternals(); // ✅ 顶层调用 Hook
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as any[]);
  const [currentQ, setCurrentQ] = useState('');
  const [contextNode, setContextNode] = useState(initialNode);
  const [contextText, setContextText] = useState('');
  const [graphId, setGraphId] = useState<number | null>(null);

  const { t } = useTranslation();

    // ★ 新增：在组件顶部声明一个 ref 存最近一次 context 高亮信息
  const lastContextHLRef = useRef<{ nodeId: string; start: number; end: number; text: string; scope?: { qaIndex: number; field: 'question'|'answer' } } | null>(null);
    // ★ CHANGED: 扩展 selectionRef，加入 offsets
    const selectionRef = useRef<{
      text: string,
      node: any,
      rect: DOMRect | null,
      offsets?: { start: number; end: number },
      scope?: { qaIndex: number; field: 'question'|'answer' },
      relativePosition: any,
      toolboxOffset?: { x: number; y: number }
    } | null>(null);
    const toolboxElRef = useRef<HTMLDivElement | null>(null);
    // const [hasSubmitted, setHasSubmitted] = useState(false);

    const bootstrappedRef = useRef(false);
    useEffect(() => {
        console.log('✅ 组件挂载完成');
        bootstrappedRef.current = false;
        return () => {
          console.log('❌ 组件即将卸载');
          bootstrappedRef.current = true;
        };
    }, []);

    // 接收来自首页的初始问题并自动提交（只执行一次）
    
    // useEffect(() => {
    //   if (bootstrapQuestion && !bootstrappedRef.current) {
    //     bootstrappedRef.current = true;
    //     // 直接使用覆盖参数，避免依赖 state 更新时序
    //     handleInputSubmit(bootstrapQuestion);
    //   }
    // }, [bootstrapQuestion]);

    // ★ NEW: 首次挂载：如有 prefillGraph 则直接载入
    useEffect(() => {
      if (graphId !== null) return; // 已存在
      if (prefillGraph) {
        try {
          const { nodes: pNodes, edges: pEdges, id } = prefillGraph;
          setNodes(pNodes as any);
          setEdges(pEdges as any);
          setGraphId(id);
          if (HL_DEBUG) console.log('[graph] 已载入已有图 id=', id, ' nodes=', pNodes.length, ' edges=', pEdges.length);
          if (bootstrapQuestion && !bootstrappedRef.current) {
            bootstrappedRef.current = true;
            // 直接使用覆盖参数，避免依赖 state 更新时序
            handleInputSubmit(bootstrapQuestion);
          }
        } catch (e) {
          console.error('预载图失败', e);
        }
      }
    }, [prefillGraph, bootstrapQuestion]);

    // 监听 nodes / edges 变化进行节流更新
    const saveTimerRef = useRef<number | null>(null);
    const pendingRef = useRef(false);
    useEffect(() => {
      if (graphId === null) return; // 尚未创建
      pendingRef.current = true;
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        if (!pendingRef.current) return;
        pendingRef.current = false;
        // 只有 nodes 最后一个元素有 llmResponse 才去更新
        const lastNode = nodes[nodes.length - 1];
        const lastContext = Array.isArray(lastNode?.data?.context) ? lastNode.data.context[lastNode.data.context.length - 1] : null;
        if (lastContext && lastContext.llmResponse) {
          await GraphService.updateGraph(graphId, {
            title: Array.isArray(nodes[0].data.context) && nodes[0].data.context.length > 0
              ? nodes[0].data.context[0].question
              : '',
            nodes: nodes,
            edges: edges
          });
        }
        if (HL_DEBUG) console.log('[graph] 已自动保存 graphId=', graphId, ' nodes=', nodes.length, ' edges=', edges.length);
      }, 800); // 800ms 防抖
      return () => {
        if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      };
    }, [nodes, edges, graphId]);

    const getNodeById = (id: string) => nodes.find((node) => node.id === id);

    const { getZoom } = useReactFlow();

      /**
       * 获取以 baseNodeId 为基节点的最后一个直接子节点的 ID
       */
    function getCurrentChildNodeId(currentNodes: any[], baseNodeId: string): object {
          const regex = new RegExp(`^${baseNodeId}-(\\d+)$`);
          let maxNum = 0;
    currentNodes.forEach((node: any) => {
              const match = node.id.match(regex);
              if (match) {
                  const num = parseInt(match[1], 10);
                  if (num > maxNum) maxNum = num;
              }
          });
          console.log('getCurrentChildNodeId, baseNodeId:', baseNodeId, ', maxNum:', maxNum, ', nodes:', nodes);
          return {
              lastNodeId: maxNum == 0 ? null: `${baseNodeId}-${maxNum}` ,
              newNodeId: `${baseNodeId}-${maxNum + 1}`
          };
      }

    const addNewNodeAfterAsk = useCallback((oldNode: any, currentQ: string, isBranchNode: boolean, referenceContext: string) => {
          const currentBaseNode = getNodeById(oldNode.id)
          console.log('addNewNodeAfterAsk, lastNode:', currentBaseNode);
          console.log('addNewNodeAfterAsk, currentQ:', currentQ);
          console.log('addNewNodeAfterAsk, isBranchNode:', isBranchNode);
          const dynamicHandleId = `dyn-handle-${Date.now()}`;

          let dynamicHandleTop = selectionRef.current?.relativePosition?.dynamicHandleTop;
          // let dynamicHandleLeft = selectionRef.current?.relativePosition?.dynamicHandleLeft;

          setNodes((nodes) => nodes.map((node) => {
            if (node.id === oldNode.id) {
              const newHandle = {
                id: dynamicHandleId,
                type: 'source',
                position: Position.Right,
                style:{ top: dynamicHandleTop }
              };
              return {
                ...node,
                data: {
                  ...node.data,
                  dynamicHandles: [...((node.data.dynamicHandles as any[]) || []), newHandle],
                },
              };
            }
            return node;
          }));

          updateNodeInternals(oldNode.id);

          const {lastNodeId, newNodeId}: any = getCurrentChildNodeId(nodes, oldNode.id);
          const lastNode = getNodeById(lastNodeId)

    let positionX=(currentBaseNode?.position.x || 0) + 320;
    let positionY=(currentBaseNode?.position.y || 0) - 150;
          console.log('####addNewNodeAfterAsk, lastNodeId:', lastNodeId, ', newNodeId:', newNodeId, ', lastNode:', lastNode);
      if (lastNode) {
        positionX = lastNode.position.x + 25;
        positionY = lastNode.position.y + (lastNode.measured?.height || 0) + 10; // 在最后一个子节点的下方
      }
          console.log('####addNewNodeAfterAsk, newNodeId:', newNodeId);
          const newNode = {
              id: newNodeId,
              data: {
                  label: getNodeLabel(undefined, currentQ, '', referenceContext),
                  context: [{question: currentQ, llmResponse: null}],
                  isAfterAsk: true,
                  referenceContext: referenceContext
              },
              position: {
                  x: positionX,
                  y: positionY,
              },
              type: isBranchNode? 'branch-markdown': 'markdown',
              selected: true,
              dragHandle: '.drag-handle__custom'
          };
          setContextNode(newNode);
          setNodes((nds) => nds.map(node => ({ ...node, selected: false })).concat(newNode));
    setEdges((eds: any) => [
            ...eds,
            {
              id: `${oldNode.id}-${newNodeId}`,
              source: oldNode.id,
              target: newNodeId,
              sourceHandle: dynamicHandleId,
              targetHandle: isBranchNode ? 'target-left' : 'target-top',
              type: 'smoothstep',
            }
          ]);

          return newNodeId;
      }, [nodes, updateNodeInternals, getCurrentChildNodeId, getNodeById, setEdges, setNodes]);

      // 生成节点 label 的函数
    const getNodeLabel = (node: any, currentQ: string, llmResponse: string | null, referenceContext: string = '') => {
          console.log("getNodeLabel", { node, currentQ, llmResponse, referenceContext })
        const context =
            node && node.data && Array.isArray(node.data.context)
                ? node.data.context
                : [];

          const fullContext = [
              ...context[context.length - 1]?.llmResponse ? context : context.slice(0, -1),
              {question: currentQ, llmResponse: llmResponse}
          ];
          let parts = []
          if(referenceContext) {
            parts.push(`> ${t('questionBackground')}: \n${referenceContext}\n`)
            parts.push("---\n")}
          else if (node && node.data && node.data.referenceContext) {
            parts.push(`> ${t('questionBackground')}: \n${node.data.referenceContext}\n`)
            parts.push("---\n")
          }
        // 只保留 LLM 原生 markdown
        return [
          ...parts,
          ...fullContext
            .map((item) => {
              let innerParts = [];
              if (item.question) innerParts.push(`## 提问: ${item.question}\n`);
              innerParts.push("---\n");
              if (item.llmResponse) innerParts.push(`## LLM回复: \n${item.llmResponse}\n`);
              return innerParts.join('\n');
            })
            .join('\n---\n')
        ].join('');
      }

    const updateNodeAfterAsk = useCallback((question: string, newNodeId?: string) => {
      console.log("updateNodeAfterAsk", question)
      const targetId = newNodeId ? newNodeId : contextNode.id
      const newQNA = { question, llmResponse: null }
      setNodes(nds => nds.map(node => node.id === targetId ? {
        ...node,
        data: {
          ...node.data,
          context: [...(node.data.context as any[] || []), newQNA],
          label: getNodeLabel(node, question, null),
          isAfterAsk: true,
        }
      } : node))
    }, [contextNode])

    const updateNodeAfterResponse = useCallback((question: string, llmResponse: string, newNodeId?: string) => {
      const targetId = newNodeId ? newNodeId : contextNode.id
      const newQNA = { question, llmResponse }
      console.log("updateNodeAfterResponse, nodes", nodes)
      setNodes(nds => nds.map(node => node.id === targetId ? {
        ...node,
        data: {
          ...node.data,
          context: [...(node.data.context as any[]).slice(0, -1), newQNA],
          label: getNodeLabel(node, question, llmResponse),
          isAfterAsk: false,
        }
      } : node))
    }, [contextNode])

    const handleInputSubmit = async (overrideQ?: string) => {
      // 支持传入覆盖问题，避免初始引导时因 state 还未更新导致跳过
      const q = (overrideQ ?? currentQ).trim();
      console.log('handleInputSubmit, overrideQ:', overrideQ, ', currentQ:', currentQ, "final q:", q);
      if (!contextNode || !q) return;

      // 若是 override 提交，确保 UI 输入框清空
      if (!overrideQ) setCurrentQ('');

      let llmResponse;
      let optQ;
      
      if (contextText) {
        console.log('contextText 存在，准备构建带上下文的问题');
        const oldQ = (contextNode as any).data.context?.[selectionRef.current?.scope?.qaIndex]?.question || '';
        const referenceContext = `${t('contextPrefix')} “${oldQ}” ${t('contextAffix')} “${contextText}”`;
        optQ = `${referenceContext}: ${q}` + "\n\n";
        const newNodeId = addNewNodeAfterAsk(contextNode, q, true, referenceContext);
        const threadId = prefillGraph?.id + "-" + newNodeId;
        const contextThreadId = prefillGraph?.id + "-" + contextNode.id;
        console.log("###selectionRef:",  selectionRef);
        const contextMsgIndex = selectionRef.current?.scope?.qaIndex;
        llmResponse = await LLMService.askQuestion(optQ, threadId, null, contextThreadId, contextMsgIndex);
        updateNodeAfterResponse(q, llmResponse, newNodeId);
      } else {
        console.log('contextText 不存在，直接使用当前问题');
        optQ = q;
        updateNodeAfterAsk(q, undefined);
        const threadId = prefillGraph?.id + "-" + contextNode.id;
        llmResponse = await LLMService.askQuestion(optQ, threadId);
        updateNodeAfterResponse(q, llmResponse, undefined);
      }
      console.log('LLM Response:', llmResponse);
      setContextText('');
      lastContextHLRef.current = null;
    };


    // ★ CHANGED: onLabelMouseUp 接收来自子组件的 selection（含 offsets/rect），不再自己从 window 读
    const handleMouseUp = useCallback((id: string, data: any) => {
        // if(!hasSubmitted) return;

        const sel: any = data?.selection;
        const text = sel?.text?.trim() || '';
        if (HL_DEBUG) console.log('父模块接收到 parent.handleMouseUp', { id, sel, text });

        if (sel && text) {
            const rect = sel.rect;

            // 计算工具条/动态句柄相对位置
            let dynamicHandleTop = undefined;
            let dynamicHandleLeft = undefined;
            const zoom = getZoom();
            const nodeElem = document.querySelector(`[data-id="${id}"] .markdown-node`);
            if (nodeElem) {
                const nodeRect = (nodeElem as HTMLElement).getBoundingClientRect();
                dynamicHandleLeft = (rect.left - nodeRect.left) / zoom;
                dynamicHandleTop = (rect.top - nodeRect.top) / zoom;
            }

            selectionRef.current = {
              text,
              node: { id, data },
              relativePosition: { dynamicHandleLeft, dynamicHandleTop },
              rect,
              offsets: sel.offsets,
              scope: sel.scope
            };

            if (HL_DEBUG) console.log('选择内容暂存到 selectionRef.current', selectionRef.current);
            showNativeToolbox(rect);
        } else {
            hideNativeToolbox();
            selectionRef.current = null;
        }
    }, [getZoom]);

    // 原生插入工具条
    function showNativeToolbox(rect: DOMRect) {
        hideNativeToolbox();
        const el = document.createElement('div');
        el.innerText = '知识延伸';
        el.style.position = 'absolute';
        el.style.left = `${rect.right + window.scrollX}px`;
        el.style.top = `${rect.top + window.scrollY - 40}px`;
        el.style.zIndex = '10000';
        el.style.background = '#fff';
        el.style.border = '1px solid #ddd';
        el.style.borderRadius = '4px';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        el.style.padding = '4px 8px';
        el.style.cursor = 'pointer';
        el.style.color = 'blue';
        el.onclick = handleNativeToolboxClick;
        document.body.appendChild(el);
        toolboxElRef.current = el;

        if (HL_DEBUG) console.log('知识延伸工具条位置', { left: el.style.left, top: el.style.top });

        if (selectionRef.current && selectionRef.current.node) {
            const nodeElem = document.querySelector(`[data-id="${selectionRef.current.node.id}"] .markdown-node`);
            if (nodeElem) {
                const nodeRect = (nodeElem as HTMLElement).getBoundingClientRect();
                const y = rect.top - 40 - nodeRect.top;
                const x = rect.right - nodeRect.left;
                selectionRef.current.toolboxOffset = { x, y };
                if (HL_DEBUG) console.log('知识延伸工具条 在节点内部的 位置', selectionRef.current.toolboxOffset);
            }
        }
    }

    function hideNativeToolbox() {
        if (toolboxElRef.current) {
            if (HL_DEBUG) console.log('隐藏知识延伸工具条 hideNativeToolbox');
            document.body.removeChild(toolboxElRef.current);
            toolboxElRef.current = null;
        }
    }
    // 工具条点击 —— ★ NEW: 在此“落盘”高亮 offsets
    function handleNativeToolboxClick() {
        if (HL_DEBUG) console.log('工具条点击 handleNativeToolboxClick');

         // ① 先把“上一次的知识延伸高亮”撤销（如果存在且尚未被其他流程清掉）
        clearPreviousContextHighlightIfAny();

        if (selectionRef.current) {
            const { node, text, offsets } = selectionRef.current;
            if (HL_DEBUG) console.log('工具条点击', { nodeId: node.id, text, offsets });
            setContextNode(node);
            setContextText(text);

            if (offsets) {
              setNodes((nds) =>
                nds.map((n) => {
                  if (n.id === node.id) {
                    const next = [
                      ...((n.data.highlights as any[]) || []),
                      { start: offsets.start, end: offsets.end, scope: selectionRef.current?.scope, text }
                    ];
                    return { ...n, data: { ...n.data, highlights: next } };
                  }
                  return n;
                })
              );
              lastContextHLRef.current = {
                nodeId: node.id, start: offsets.start, end: offsets.end, text,
                scope: selectionRef.current?.scope
              };
            }

        }
        hideNativeToolbox();
        window.getSelection()?.removeAllRanges();
    }

    // 组件卸载时清理
    useEffect(() => () => hideNativeToolbox(), []);

    // 新增：全局点击自动隐藏工具条
    // useEffect(() => {
    //     function handleGlobalClickDown(e: MouseEvent) {
    //       console.log('全局点击检测 handleGlobalClickDown', e.target);
    //         if (toolboxElRef.current && !toolboxElRef.current.contains(e.target as Node)) {
    //             hideNativeToolbox();
    //             window.getSelection()?.removeAllRanges();
    //         }
    //     }
    //     document.addEventListener('mousedown', handleGlobalClickDown);
    //     return () => {
    //         document.removeEventListener('mousedown', handleGlobalClickDown);
    //     };
    // }, []);

    // 1. handleMouseUp 作为 onLabelMouseUp
    // 2. 渲染前为每个 node 注入 onLabelMouseUp 到 data
    // 单独的节点点击处理，保持引用稳定
    const handleNodeClick = useCallback((id: string) => {
      if (HL_DEBUG) console.log('点击节点 handleNodeClick', id);
      const n = getNodeById(id);
  if (n) setContextNode(n as any);
      // 仅在选中状态变化时才创建新数组，减少无谓渲染
      setNodes(nds => {
        let changed = false;
        const next = nds.map(x => {
          const shouldSelect = x.id === id;
          if (x.selected !== shouldSelect) {
            changed = true;
            return { ...x, selected: shouldSelect };
          }
          return x;
        });
        return changed ? next : nds; // 没变化直接复用旧引用
      });
    }, [getNodeById]);

    // 使用 useMemo 缓存带有 handler 的节点，避免每次 render 生成新 data 对象
    const nodesWithHandler = useMemo(() => {
      console.log('生成 nodesWithHandler');
      return nodes.map((node: Node) => ({
        ...node,
        data: {
          ...node.data,
          onLabelMouseUp: handleMouseUp,
          onNodeClick: handleNodeClick
        }
      }));
    }, [nodes, handleMouseUp, handleNodeClick]);

    const [colorMode, setColorMode] = useState<ColorMode>('light');
    const onChange: ChangeEventHandler<HTMLSelectElement> = (evt) => {
        setColorMode(evt.target.value as ColorMode);
      };

    // ★ 新增：关闭 context 时的删除逻辑
    const handleClearContextHighlight = useCallback((text: string) => {
      const trimmed = (text || '').trim();
      if (!trimmed) return;

      setNodes((nds) => {
        // 1) 优先尝试用最近一次记录的高亮（精确）
        const recent = lastContextHLRef.current;
        if (recent && recent.text === trimmed) {
          return nds.map(n => {
            if (n.id !== recent.nodeId) return n;
            const before = n.data?.highlights || [];
            const after = (before as any[]).filter(r => !(r.start === recent.start && r.end === recent.end));
            return { ...n, data: { ...n.data, highlights: after } };
          });
        }

        // 2) 回退：按文本比对删除（在当前 contextNode 上）
        const fallbackNodeId = contextNode?.id;
        if (!fallbackNodeId) return nds;

        // 拿渲染后的“允许文本”
        const collected = getAllowedTextFromNode(fallbackNodeId);
        if (!collected) return nds;
        const full = collected.text;

        return nds.map(n => {
          if (n.id !== fallbackNodeId) return n;
          const before = n.data?.highlights || [];
          // 删除所有刚好切片等于 text 的区间（可根据需要改为大小写/空白宽松比较）
          const after = (before as any[]).filter(r => full.slice(r.start, r.end) !== trimmed);
          return { ...n, data: { ...n.data, highlights: after } };
        });
      });

      // 清空最近记录，避免误删
      lastContextHLRef.current = null;
    }, [contextNode?.id, setNodes]);

    // 精确清除最近一次通过“知识延伸”写入的高亮（不依赖文本比对）
    const clearPreviousContextHighlightIfAny = useCallback(() => {
      const recent = lastContextHLRef.current;
      if (!recent) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== recent.nodeId) return n;
          const before = n.data?.highlights || [];
          const after = (before as any[]).filter((r: any) =>
            !(r.start === recent.start && r.end === recent.end &&
              ((r.scope?.qaIndex ?? -1) === (recent.scope?.qaIndex ?? -1)) &&
              ((r.scope?.field ?? 'answer') === (recent.scope?.field ?? 'answer'))
            )
          );
          return { ...n, data: { ...n.data, highlights: after } };
        })
      );
      lastContextHLRef.current = null;
    }, [setNodes]);

    // 导出：nodesWithHandler（去除 handler 函数）与 edges
    const exportGraph = useCallback(() => {
      const sanitizedNodes = nodesWithHandler.map(n => {
        const { onLabelMouseUp, onNodeClick, ...restData } = (n.data as any) || {};
        return {
          ...n,
          data: { ...restData }
        };
      });
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        nodes: sanitizedNodes,
        edges
      };
      onGraphExport?.(payload);
      return payload;
    }, [nodesWithHandler, edges, onGraphExport]);

    const importGraph = useCallback((payload: any) => { 
      if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) return; 
      const restored = payload.nodes.map(
        (node: any) => ({ 
          ...node, 
          data: { 
            ...node.data, 
            onLabelMouseUp: handleMouseUp, 
            onNodeClick: handleNodeClick 
          } 
        })
      ); 
      
      // 先设置节点，再异步设置边，确保节点及其 handles 已挂载
      setNodes(restored);

      // 使用 requestAnimationFrame 让 ReactFlow 完成一次渲染后再处理内部更新与边集合
      requestAnimationFrame(() => {
        // 确保缺失的动态 source handle 被重建（根据 edge.sourceHandle）
        const edges: any[] = payload.edges || [];
        let needNodeUpdate = false;
        const patchedNodes = restored.map((n: any) => {
          const dyn = Array.isArray(n.data?.dynamicHandles) ? [...n.data.dynamicHandles] : [];
          const relatedEdges = edges.filter((e: any) => e.source === n.id && e.sourceHandle);
          relatedEdges.forEach((e: any) => {
            if (e.sourceHandle && !dyn.some(h => h.id === e.sourceHandle)) {
              dyn.push({ id: e.sourceHandle, type: 'source', position: 1 /* Position.Right */, style: { top: 40 } });
              needNodeUpdate = true;
              console.warn('[importGraph] Reconstructed missing source handle', e.sourceHandle, 'on node', n.id);
            }
          });
          return dyn.length !== (Array.isArray(n.data?.dynamicHandles) ? n.data.dynamicHandles.length : 0)
            ? { ...n, data: { ...n.data, dynamicHandles: dyn } }
            : n;
        });
        if (needNodeUpdate) {
          setNodes(patchedNodes);
        }
        console.log('Restored nodes:', patchedNodes);
        patchedNodes.forEach((n: any) => updateNodeInternals(n.id));
        console.log('Restored edges (deferred):', edges);
        setEdges(edges as any);
      });

      
      
      
      onGraphImport?.(payload); 
      

        }, [updateNodeInternals, handleMouseUp, handleNodeClick, setNodes, setEdges, onGraphImport]
      );

    // 将 API 注册给父组件
    useEffect(() => {
      onRegisterApi?.({ exportGraph, importGraph });
    }, [onRegisterApi, exportGraph, importGraph]);

    return (
        <div className="w-screen h-screen relative">
            <div className="reactflow-wrapper">
                <ReactFlow
                    nodes={nodesWithHandler}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    // onNodeClick={handleNodeClick}
                    fitView
                    nodeTypes={nodeTypes}
                    colorMode={colorMode}
                >
                    <MiniMap position="top-right"/>
                    <Controls/>
                    <Background/>
                    <Panel position="top-right">
                        <select
                          className="xy-theme__select"
                          onChange={onChange}
                          data-testid="colormode-select"
                        >
                          <option value="dark">dark</option>
                          <option value="light">light</option>
                          <option value="system">system</option>
                        </select>
                      </Panel>
                </ReactFlow>
            </div>
            <ChatBox
                setContextPrompt={setContextText}
                contextPrompt={contextText}
                inputValue={currentQ}
                setInputValue={setCurrentQ}
                handleInputSubmit={handleInputSubmit}
                onClearContextHighlight={handleClearContextHighlight}
            />
        </div>
    );
}
