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

const LLM_BASE_URL: string = (typeof window !== 'undefined'
  ? (window.__LLM_BASE__ || import.meta.env.VITE_LLM_BASE_URL || '/api')
  : (process.env.VITE_LLM_BASE_URL as string) || 'http://127.0.0.1:8000');

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

