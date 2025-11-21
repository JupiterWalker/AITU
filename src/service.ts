interface LLMRequest {
  context_msg_index: number;
  context_thread_id: string;
  question: string;
  context?: string;
  history?: Array<{ question: string; answer: string }>;
  model?: string; // 可选，指定使用的模型
  thread_id?: string;
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
  static async askQuestion(question: string, thread_id: string, model?: string, contextThreadId?: string, contextMsgIndex?: number): Promise<string> {
    const request: LLMRequest = {
      question,
      context_msg_index: 0,
      context_thread_id: '',
    };
    if (model) {
      request.model = model;
    } else {
      request.model = 'THUDM/glm-4-9b-chat';
    }
    if (contextThreadId) {
      request.context_thread_id = contextThreadId;
    }
    if (contextMsgIndex) {
      request.context_msg_index = contextMsgIndex;
    }
    request.thread_id = thread_id;

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
      // 加尾斜杠避免 FastAPI 重定向 /graphs -> /graphs/ 产生混合内容问题
      const res = await fetch(`${LLM_BASE_URL}/graphs/`, {
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
      // POST 也加尾斜杠避免重定向
      const res = await fetch(`${LLM_BASE_URL}/graphs/`, {
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

// 用户相关 API
export interface UserPublic {
  id: number;
  user_name: string;
  ad_user?: string | null;
  ad_api_key?: string | null;
  ad_model?: string | null;
  ad_token?: string | null;
}

export class UserService {
  static async getUserIdByToken(token: string): Promise<number | null> {
    try {
      const res = await fetch(`${LLM_BASE_URL}/users/token/${encodeURIComponent(token)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.id ?? null;
    } catch (e) {
      console.error('token 验证失败', e);
      return null;
    }
  }

  static async updateCredentials(userId: number, user_name: string, password: string): Promise<UserPublic | null> {
    try {
      const res = await fetch(`${LLM_BASE_URL}/users/${userId}/credentials/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name, password })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('更新凭证失败', e);
      return null;
    }
  }

  static async createUser(user_name: string, password: string, token?: string): Promise<UserPublic | null> {
    try {
      const body: any = { user_name, password };
      if (token) body.ad_token = token;
      const res = await fetch(`${LLM_BASE_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('创建用户失败', e);
      return null;
    }
  }

  static async login(user_name: string, password: string): Promise<UserPublic | null> {
    try {
      const res = await fetch(`${LLM_BASE_URL}/users/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name, password })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('登录失败', e);
      return null;
    }
  }
}

