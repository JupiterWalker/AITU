from fastapi import APIRouter
import logging
import traceback

logger = logging.getLogger(__name__)
api_router = APIRouter()

def _log_import_error(name: str, exc: Exception) -> None:
    tb_str = ''.join(traceback.format_exception(exc.__class__, exc, exc.__traceback__))
    logger.error("Failed to import router '%s': %s\n%s", name, exc, tb_str)

# Users router
try:
    from backend.app.api.v1.routes.users import router as users_router
    api_router.include_router(users_router)
except Exception as e:  # pragma: no cover
    _log_import_error('users', e)

# Graphs router
try:
    from backend.app.api.v1.routes.graphs import router as graphs_router
    api_router.include_router(graphs_router, tags=["graphs"])    
except Exception as e:  # pragma: no cover
    _log_import_error('graphs', e)

# Interaction router
try:
    from backend.app.api.v1.routes.interaction import router as interaction_router
    api_router.include_router(interaction_router, tags=["interaction"])  
except Exception as e:  # pragma: no cover
    _log_import_error('interaction', e)
