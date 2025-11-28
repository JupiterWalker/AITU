from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from .api.v1.api import api_router


def create_app() -> FastAPI:
    app = FastAPI(title="My FastAPI App")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Authorization", "X-Access-Token"],
    )

    app.include_router(api_router, prefix="/api/v1")

    return app

app = create_app()
