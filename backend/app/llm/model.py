import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI  # 注意：使用 langchain_openai 而非 langchain

# 加载 .env（与本文件同目录）
_ENV_PATH = Path(__file__).resolve().parent / ".env"
if _ENV_PATH.exists():
    load_dotenv(_ENV_PATH)
else:
    # 兼容旧路径调用（容器内可能在 /app 工作目录下）
    legacy_path = Path.cwd() / "backend" / "llm" / ".env"
    if legacy_path.exists():
        load_dotenv(legacy_path)

SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY")
if not SILICONFLOW_API_KEY:
    # 提示缺失而不打印泄露
    raise RuntimeError("Missing SILICONFLOW_API_KEY. Create backend/llm/.env from .env.example and set the key.")

BASE_URL = os.getenv("BASE_URL", "https://api.siliconflow.cn/v1")


# 封装 SiliconFlow 为 LangChain 兼容的模型
class SiliconFlowChatModel(ChatOpenAI):
    def __init__(self, **kwargs):
        # 硬编码 SiliconFlow 的 Base URL 和 API Key
        super().__init__(
            # api_key=SILICONFLOW_API_KEY,
            base_url=BASE_URL,
            **kwargs
        )

# model = SiliconFlowChatModel(model="THUDM/glm-4-9b-chat")

# model = SiliconFlowChatModel(model="THUDM/GLM-Z1-32B-0414")
# model = SiliconFlowChatModel(model="deepseek-ai/DeepSeek-V3")

# 使用示例
# if __name__ == "__main__":
#     model = SiliconFlowChatModel(model="Qwen/Qwen2.5-72B-Instruct")
#
#     # 同步调用（非流式）
#     response = model.invoke("推理模型会给市场带来哪些新的机会")
#     print(response.content)
#
#     # 流式调用
#     for chunk in model.stream("推理模型会给市场带来哪些新的机会"):
#         if hasattr(chunk, "content") and chunk.content:
#             print(chunk.content, end="", flush=True)