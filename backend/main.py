import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from .chat import chat_router

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

# 包含 chat_router 的路由
app.include_router(chat_router)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)