import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

# 兼容直接运行 (python backend/main.py) 与包方式 (python -m backend.main)
import sys, traceback, importlib.util
print("[debug] __package__ =", __package__)
print("[debug] sys.path =", sys.path)

def _show(e, tag):
    print(f"[debug] {tag} failed: {type(e).__name__}: {e}")
    traceback.print_exc()

try:
    from .modules.interaction.router import router as interaction_router
    from .modules.graph.router import router as graphs_router
    from .modules.user.router import router as user_router
except ImportError as e:
    # 仅当确实是“没有父包”才尝试 fallback；否则输出真实错误
    if "__package__ is None" in repr(e) or "attempted relative import" in repr(e):
        _show(e, "relative import (no package)")
        try:
            from modules.interaction.router import router as interaction_router  # type: ignore
            from modules.graph.router import router as graphs_router  # type: ignore
            from modules.user.router import router as user_router  # type: ignore
        except ImportError as e2:
            _show(e2, "absolute fallback")
            raise
    else:
        _show(e, "relative import (internal)")
        raise

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或者限制为前端地址，如 ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法，包括 OPTIONS、POST、GET 等
    allow_headers=["*"],  # 允许所有 headers（包括 Content-Type）
    expose_headers=["Authorization", "X-Access-Token"],  # 允许前端读取这些响应头
)

@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}

# 注册模块化路由
app.include_router(interaction_router)
app.include_router(graphs_router)
app.include_router(user_router)


if __name__ == "__main__":
    # 提示更推荐的启动方式
    print("[info] 推荐使用: uvicorn backend.main:app --reload 或 python -m backend.main")
    uvicorn.run(app, host="0.0.0.0", port=8000)