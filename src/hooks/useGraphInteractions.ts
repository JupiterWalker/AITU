import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { Position as FlowPosition } from '@xyflow/react';

interface UseGraphInteractionsArgs {
    nodes: Node[];
    setNodes: (updater: (nds: Node[]) => Node[]) => void;
    setEdges: (updater: (eds: Edge[]) => Edge[]) => void | ((value: Edge[]) => void);
    updateNodeInternals: (id: string) => void;
    getNodeById: (id: string) => Node | undefined;
    selectionRef: React.MutableRefObject<any>;
    setContextNode: (node: any) => void;
    hlDebug?: boolean;
}

const log = (enabled: boolean | undefined, ...p: any[]) => { if (enabled) console.log('[useGraphInteractions]', ...p); };

function allocateChildIds(nodes: Node[], baseId: string) {
    const regex = new RegExp(`^${baseId}-(\\d+)$`);
    let maxNum = 0;
    nodes.forEach(n => {
        const m = n.id.match(regex);
        if (m) { const num = parseInt(m[1], 10); if (num > maxNum) maxNum = num; }
    });
    return { lastNodeId: maxNum === 0 ? null : `${baseId}-${maxNum}`, newNodeId: `${baseId}-${maxNum + 1}` };
}

function buildLabel(context: any[] = [], referenceContext?: string) {
    const parts: string[] = [];
    if (referenceContext) { parts.push(`> 问题背景: \n${referenceContext}\n---\n`); }
    parts.push(...context.map(c => `Q: ${c.question}\n${c.llmResponse ? c.llmResponse : ''}`));
    return parts.join('\n');
}

export function useGraphInteractions(args: UseGraphInteractionsArgs) {
    const { nodes, setNodes, setEdges, updateNodeInternals, getNodeById, selectionRef, setContextNode, hlDebug } = args;

    const handleNodeClick = useCallback((id: string) => {
        const n = getNodeById(id);
        if (n) setContextNode(n);
        setNodes(nds => nds.map(x => ({ ...x, selected: x.id === id })));
    }, [getNodeById, setNodes, setContextNode]);

    const addNewNodeAfterAsk = useCallback((oldNode: any, currentQ: string, isBranchNode: boolean, referenceContext: string) => {
        const base = getNodeById(oldNode.id);
        const dynHandleId = `dyn-handle-${Date.now()}`;
        const dynamicHandleTop = selectionRef.current?.relativePosition?.dynamicHandleTop;

        setNodes(nds => nds.map(n => {
            if (n.id !== oldNode.id) return n;
            const newHandle = { id: dynHandleId, type: 'source', position: FlowPosition.Right, style: { top: dynamicHandleTop } };
            const prevHandles: any[] = Array.isArray((n.data as any)?.dynamicHandles) ? (n.data as any).dynamicHandles : [];
            return { ...n, data: { ...n.data, dynamicHandles: [...prevHandles, newHandle] } };
        }));
        updateNodeInternals(oldNode.id);

        const { lastNodeId, newNodeId } = allocateChildIds(nodes, oldNode.id);
        const lastNode = lastNodeId ? getNodeById(lastNodeId) : null;
        let positionX = (base?.position.x || 0) + 320;
        let positionY = (base?.position.y || 0) - 150;
        if (lastNode) {
            positionX = lastNode.position.x + 25;
            positionY = lastNode.position.y + (lastNode.measured?.height || 0) + 10;
        }
        const newNode = {
            id: newNodeId,
            data: { label: buildLabel([{ question: currentQ, llmResponse: null }], referenceContext), context: [{ question: currentQ, llmResponse: null }], isAfterAsk: true, referenceContext },
            position: { x: positionX, y: positionY },
            type: isBranchNode ? 'branch-markdown' : 'markdown',
            selected: true,
            dragHandle: '.drag-handle__custom'
        } as Node;
        setContextNode(newNode);
        setNodes(nds => {
            const cleared = nds.map(n => ({ ...n, selected: false }));
            return [...cleared, newNode];
        });
        setEdges(eds => eds.concat({ id: `${oldNode.id}-${newNodeId}`, source: oldNode.id, target: newNodeId, sourceHandle: dynHandleId, targetHandle: isBranchNode ? 'target-left' : 'target-top', type: 'smoothstep' }));
        log(hlDebug, 'addNewNodeAfterAsk', newNodeId);
        return newNodeId;
    }, [nodes, getNodeById, selectionRef, setNodes, setEdges, setContextNode, updateNodeInternals, hlDebug]);

    const updateNodeAfterAsk = useCallback((currentQ: string, contextNode: any, newNodeId?: string) => {
        const targetId = newNodeId || contextNode.id;
        setNodes(nds => nds.map(n => {
            if (n.id !== targetId) return n;
            const contextArr: any[] = Array.isArray((n.data as any)?.context) ? [...(n.data as any).context] : [];
            contextArr.push({ question: currentQ, llmResponse: null });
            const refCtx = (n.data as any)?.referenceContext as (string | undefined);
            return { ...n, data: { ...n.data, isAfterAsk: true, context: contextArr, label: buildLabel(contextArr, refCtx) } };
        }));
        log(hlDebug, 'updateNodeAfterAsk', targetId);
    }, [setNodes, hlDebug]);

    const updateNodeAfterResponse = useCallback((_: string, contextNode: any, llmResponse: string, newNodeId?: string) => {
        const targetId = newNodeId || contextNode.id;
        setNodes(nds => nds.map(n => {
            if (n.id !== targetId) return n;
            const contextArr: any[] = Array.isArray((n.data as any)?.context) ? [...(n.data as any).context] : [];
            const last = contextArr[contextArr.length - 1];
            if (last && last.llmResponse == null) last.llmResponse = llmResponse;
            const refCtx = (n.data as any)?.referenceContext as (string | undefined);
            return { ...n, data: { ...n.data, context: contextArr, isAfterAsk: false, label: buildLabel(contextArr, refCtx) } };
        }));
        log(hlDebug, 'updateNodeAfterResponse', targetId);
    }, [setNodes, hlDebug]);

    return { handleNodeClick, addNewNodeAfterAsk, updateNodeAfterAsk, updateNodeAfterResponse };
}
