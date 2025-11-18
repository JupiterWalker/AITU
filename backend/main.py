import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

# 兼容直接运行 (python backend/main.py) 与包方式 (python -m backend.main)
try:
    from .modules.interaction.router import router as interaction_router
    from .modules.graph.router import router as graphs_router
    from .modules.user.router import router as user_router
except ImportError:  # fallback 当没有包上下文时
    from modules.interaction.router import router as interaction_router  # type: ignore
    from modules.graph.router import router as graphs_router  # type: ignore
    from modules.user.router import router as user_router  # type: ignore

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或者限制为前端地址，如 ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法，包括 OPTIONS、POST、GET 等
    allow_headers=["*"],  # 允许所有 headers（包括 Content-Type）
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