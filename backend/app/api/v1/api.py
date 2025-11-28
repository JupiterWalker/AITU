from fastapi import APIRouter

api_router = APIRouter()

# New users routes in app
try:
    from backend.app.api.v1.routes.users import router as users_router
    api_router.include_router(users_router)
except Exception as e:
    # Fallback to backend during migration
    print(e.__traceback__)

try:
    from backend.app.api.v1.routes.graphs import router as graphs_router
    api_router.include_router(graphs_router, tags=["graphs"])    
except Exception as e:
    print(e.__traceback__)
try:
    from backend.app.api.v1.routes.interaction import router as interaction_router
    api_router.include_router(interaction_router, tags=["interaction"])
except Exception as e:
    print(e.__traceback__)
