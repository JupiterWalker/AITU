import type { Position } from "@xyflow/react";

export interface HandleConfig {
  id: string;
  type: 'source' | 'target';
  position: Position;
  style?: React.CSSProperties;
}

export interface NodeData {
  id: string;
  label: string;
  type?: string;
  measured?: { width: number; height: number };
  qaIds?: string[];
  level?: number;
  context?: { question: string; response: string }[];
  parentId?: string;
  referenceContext?: string;
  labelStyle?: React.CSSProperties;
  onNodeClick?: (id: string) => void;
  highlights?: {
    start: number;
    end: number;
    text?: string;
    scope?: { qaIndex: number; field: 'question' | 'answer' };
  }[];
  selection?: {
    start?: number;
    end?: number;
    scope?: { qaIndex: number; field: 'question' | 'answer' };
  };
  dynamicHandles?: HandleConfig[];
}

export interface CustomNodeProps {
  data: NodeData;
  selected: boolean;
  id: string;
}

export type LabelStyle = {
  question?: {
    fontSize?: number;
    color?: string;
    fontWeight?: 400 | 500 | 600 | 700;
    lineHeight?: number;
    fontFamily?: string;
    textTransform?: 'none' | 'uppercase' | 'capitalize';
    maxLines?: number;
  };
};