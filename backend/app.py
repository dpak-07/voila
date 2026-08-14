import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse

# Ensure project root and backend are in sys.path
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
for p in [str(project_root), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.config.settings import settings
    from backend.routes.auth import router as auth_router
    from backend.routes.analytics import router as analytics_router
    from backend.routes.upload import router as upload_router
    from backend.routes.rag import router as rag_router
    from backend.routes.agent_router import router as agent_router
except ImportError:
    from config.settings import settings
    from routes.auth import router as auth_router
    from routes.analytics import router as analytics_router
    from routes.upload import router as upload_router
    from routes.rag import router as rag_router
    from routes.agent_router import router as agent_router

app = FastAPI(title=settings.app_name)

# Include Core Production Routers
app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(analytics_router)
app.include_router(rag_router)
app.include_router(agent_router)

@app.get('/', response_class=HTMLResponse)
@app.get('/upload-ui', response_class=HTMLResponse)
def upload_ui():
    """Serves the sleek Upload Portal & Metrics UI."""
    html_path = backend_dir / "static" / "upload_ui.html"
    if html_path.exists():
        with open(html_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Voila Voice-of-Customer & Analytics Portal</h1>"
