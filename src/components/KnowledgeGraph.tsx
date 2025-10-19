// components/KnowledgeGraph.tsx
import {useCallback, useState, useRef, useEffect, type ChangeEventHandler} from 'react';
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
import ChatBox from './ChatBox';
import {LLMService} from "../service.ts";
import './KnowlegeGraph.css';
import 'katex/dist/katex.min.css' // 公式样式
import {
getAllowedTextFromNode} from '../utils/markdownHighlightUtils';
import { MarkdownNode, BranchMarkdownNode } from './Nodes.tsx';
import type { NodeData } from './Interface.tsx';

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

export default function KnowledgeGraph() {

    const updateNodeInternals = useUpdateNodeInternals(); // ✅ 顶层调用 Hook
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [currentQ, setCurrentQ] = useState('');
    const [contextNode, setContextNode] = useState(initialNode);
    const [contextText, setContextText] = useState('');
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
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const handleNodeClick = useCallback((event, node) => {
        console.log('Node clicked:', node);
        setContextNode(node);
    }, []);

    useEffect(() => {
        console.log('✅ 组件挂载完成');
        return () => {
          console.log('❌ 组件即将卸载');
        };
    }, []);

    // ★ NEW: 观察 nodes 变化（避免打印内容太大，只打长度与高亮数）
    useEffect(() => {
      if (!HL_DEBUG) return;
      console.groupCollapsed('察觉到 nodes 变化，当前节点信息：');
      try {
        console.table(nodes.map(n => ({
          id: n.id,
          type: n.type,
          labelLen: n.data?.label?.length || 0,
          highlightsCount: n.data?.highlights?.length || 0
        })));
      } catch {}
      console.groupEnd();
    }, [nodes]);

    const getNodeById = (id: string) => nodes.find((node) => node.id === id);

    const { getZoom } = useReactFlow();

    /**
     * 获取以 baseNodeId 为基节点的最后一个直接子节点的 ID
     */
    function getCurrentChildNodeId(currentNodes, baseNodeId: string): object {
        const regex = new RegExp(`^${baseNodeId}-(\\d+)$`);
        let maxNum = 0;
        currentNodes.forEach(node => {
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
        let dynamicHandleLeft = selectionRef.current?.relativePosition?.dynamicHandleLeft;

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
                dynamicHandles: [...(node.data.dynamicHandles || []), newHandle],
              },
            };
          }
          return node;
        }));

        updateNodeInternals(oldNode.id);

        const {lastNodeId, newNodeId}: any = getCurrentChildNodeId(nodes, oldNode.id);
        const lastNode = getNodeById(lastNodeId)

        let positionX=currentBaseNode.position.x + 320;
        let positionY=currentBaseNode.position.y - 150;
        console.log('####addNewNodeAfterAsk, lastNodeId:', lastNodeId, ', newNodeId:', newNodeId, ', lastNode:', lastNode);
        if (lastNode) {
            positionX = lastNode.position.x + 25;
            positionY = lastNode.position.y + lastNode.measured.height + 10; // 在最后一个子节点的下方
        }
        console.log('####addNewNodeAfterAsk, newNodeId:', newNodeId);
        const newNode = {
            id: newNodeId,
            data: {
                label: getNodeLabel(null, currentQ, null, referenceContext),
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
        setEdges((eds) => [
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
    const getNodeLabel = (node: any, currentQ: string, llmResponse: string, referenceContext: string = '') => {
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
          parts.push(`> 问题背景: \n${referenceContext}\n`)
          parts.push("---\n")}
        else if (node && node.data && node.data.referenceContext) {
          parts.push(`> 问题背景: \n${node.data.referenceContext}\n`)
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

    const updateNodeAfterAsk = useCallback((newNodeId: string) => {
        console.log("updateNodeAfterAsk")
        const targetId = newNodeId? newNodeId: contextNode.id
        const newQNA = {question: currentQ, llmResponse: null}
        setNodes((nds) =>
                nds.map((node) =>
                    node.id === targetId
                        ? {
                            ...node,
                            data: {
                                ...node.data,
                                context: [...(node.data.context || []), newQNA],
                                label: getNodeLabel(node, currentQ, null),
                                isAfterAsk: true,
                            },
                        }
                        : node
                )
            );
    }, [currentQ, contextNode])

    const updateNodeAfterResponse = useCallback((llmResponse: string, newNodeId: string) => {
        const targetId = newNodeId? newNodeId: contextNode.id
        const newQNA = {question: currentQ, llmResponse: llmResponse}
        setNodes((nds) =>
                nds.map((node) =>
                    node.id === targetId
                        ? {
                            ...node,
                            data: {
                                ...node.data,
                                context: [...node.data.context.slice(0, -1), newQNA],
                                label: getNodeLabel(node, currentQ, llmResponse),
                                isAfterAsk: false,
                            },
                        }
                        : node
                )
            );
    }, [currentQ, contextNode])

    const handleInputSubmit = async () => {
        setHasSubmitted(true)
        if (!contextNode || !currentQ.trim()) return;

        setCurrentQ('');

        let llmResponse;
        let optQ;
        if(contextText){
            const oldQ = contextNode.data.context?.[contextNode.data.context.length - 1]?.question || '';
            // ★ CHANGED: 传入 referenceContext
            const referenceContext = `我想进一步了解 关于我刚才问你 “${oldQ}” 时你提到的 “${contextText}”`;
            optQ = `${referenceContext}: ${currentQ}` + "\n\n"
            const newNodeId = addNewNodeAfterAsk(contextNode, currentQ, true, referenceContext);
            llmResponse = await LLMService.askQuestion(optQ);
            updateNodeAfterResponse(llmResponse, newNodeId)
        }else{
            optQ = currentQ
            updateNodeAfterAsk(null as any)
            llmResponse = await LLMService.askQuestion(optQ);
            updateNodeAfterResponse(llmResponse, null as any)
        }
        console.log('LLM Response:', llmResponse);
        setContextText('');
        // 提交问题 → 生成新节点 → 状态收尾
        lastContextHLRef.current = null;
    };

    // ★ CHANGED: onLabelMouseUp 接收来自子组件的 selection（含 offsets/rect），不再自己从 window 读
    const handleMouseUp = useCallback((id, data: NodeData) => {
        if(!hasSubmitted) return;

        const sel = data?.selection;
        const text = sel?.text?.trim() || '';
        if (HL_DEBUG) console.log('父模块接收到 parent.handleMouseUp', { id, hasSubmitted, sel, text });

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
    }, [hasSubmitted, getZoom]);

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
                      ...(n.data.highlights || []),
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
    useEffect(() => {
        function handleGlobalClickDown(e: MouseEvent) {
            if (toolboxElRef.current && !toolboxElRef.current.contains(e.target as Node)) {
                hideNativeToolbox();
                window.getSelection()?.removeAllRanges();
            }
        }
        document.addEventListener('mousedown', handleGlobalClickDown);
        return () => {
            document.removeEventListener('mousedown', handleGlobalClickDown);
        };
    }, []);

    // 1. handleMouseUp 作为 onLabelMouseUp
    // 2. 渲染前为每个 node 注入 onLabelMouseUp 到 data
    const nodesWithHandler = nodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            onLabelMouseUp: handleMouseUp,
            onNodeClick: (id: string) => {
              console.log('点击节点，id： ', { id });
              const n = getNodeById(id) || node; // 防御性兜底
              console.log('点击节点 作为 当前节点：', n);
              setContextNode(n);
              // 选中：手动设置 selected，模拟 React Flow 的效果
              setNodes(nds => nds.map(x => ({ ...x, selected: x.id === id })));
            }
        }
    }));

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
            const after = before.filter(r => !(r.start === recent.start && r.end === recent.end));
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
          const after = before.filter(r => full.slice(r.start, r.end) !== trimmed);
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
          const after = before.filter((r) =>
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

    return (
        <div className="w-screen h-screen relative">
            <div className="reactflow-wrapper">
                <ReactFlow
                    nodes={nodesWithHandler}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={handleNodeClick}
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
