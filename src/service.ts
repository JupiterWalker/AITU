interface LLMRequest {
  question: string;
  context?: string;
  history?: Array<{ question: string; answer: string }>;
  model?: string; // 可选，指定使用的模型
}

interface LLMResponse {
  answer: string;
  success: boolean;
  error?: string;
}

// Base URL: 优先环境变量，其次相对路径 /api (适配 Nginx 反向代理)，开发回退本地 8000
declare global {
  interface Window { __LLM_BASE__?: string }
}

let LLM_BASE_URL: string;
if (import.meta.env.VITE_LLM_BASE_URL) {
  LLM_BASE_URL = import.meta.env.VITE_LLM_BASE_URL;
} else {
  LLM_BASE_URL = "http://127.0.0.1:8000";
}



console.log('under browser?:', typeof window !== 'undefined');
console.log('LLM_BASE_URL:', LLM_BASE_URL);

export class LLMService {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${LLM_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('LLM API request failed:', error);
      throw error;
    }
  }

  static async getLLMResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await this.request<LLMResponse>('/ask', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      return response;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        answer: `请求失败: ${msg}`,
        success: false,
        error: msg,
      };
    }
  }

  // 简化版本，只传问题
  static async askQuestion(question: string, context?: string, model?: string): Promise<string> {
    const request: LLMRequest = { question };
    if (context) {
      request.context = context;
    }
    if (model) {
      request.model = model;
    } else {
      request.model = 'THUDM/glm-4-9b-chat';
    }

    const response = await this.getLLMResponse(request);
    return response.answer;
  }
}

// 探索图相关 API
export interface GraphBasic {
  id: number;
  title: string;
}

export interface GraphDetail extends GraphBasic {
  nodes: any[];
  edges: any[];
  exportedAt: string;
}

interface GraphCreatePayload {
  title: string;
  nodes: any[];
  edges: any[];
}

interface GraphUpdatePayload {
  title: string;
  nodes: any[];
  edges: any[];
}

export class GraphService {
  static async listGraphs(): Promise<GraphBasic[]> {
    try {
      const res = await fetch(`${LLM_BASE_URL}/graphs`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('获取探索图列表失败', e);
      return [];
    }
  }

  static async getGraph(id: number): Promise<GraphDetail | null> {
    try {
      const res = await fetch(`${LLM_BASE_URL}/graphs/${id}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('获取探索图失败', e);
      return null;
    }
  }

  static async createGraph(payload: GraphCreatePayload): Promise<GraphDetail | null> {
    try {
      const res = await fetch(`${LLM_BASE_URL}/graphs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('创建图失败', e);
      return null;
    }
  }

  static async updateGraph(id: number, payload: GraphUpdatePayload): Promise<boolean> {
    try {
      const res = await fetch(`${LLM_BASE_URL}/graphs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (e) {
      console.error('更新图失败', e);
      return false;
    }
  }
}

