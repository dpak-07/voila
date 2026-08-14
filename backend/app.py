import sys
import time
import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root and backend are in sys.path
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
for p in [str(project_root), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Configure Unbuffered Terminal Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("voila.backend")

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

# CORS: allow the Vite dev server (and file/preview origins) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Real-Time Terminal HTTP Request Logging Middleware
@app.middleware("http")
async def log_requests_to_terminal(request: Request, call_next):
    start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"
    method = request.method
    url_path = request.url.path
    query = str(request.query_params)
    full_path = f"{url_path}?{query}" if query else url_path
    
    print(f"\n>> [HTTP IN]  {method} {full_path} from {client_ip}", flush=True)
    
    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000.0
        status = response.status_code
        status_marker = "[OK]" if status < 400 else "[WARN]" if status < 500 else "[ERROR]"
        print(f"<< [HTTP OUT] {status_marker} {status} {method} {url_path} ({duration_ms:.1f}ms)", flush=True)
        return response
    except Exception as exc:
        duration_ms = (time.time() - start_time) * 1000.0
        print(f"<< [HTTP ERR] 500 {method} {url_path} failed after {duration_ms:.1f}ms: {exc}", flush=True)
        raise exc

# Startup Diagnostics Banner
@app.on_event("startup")
def startup_banner():
    print("\n" + "="*65, flush=True)
    print(f"  VOILA ANALYTICS BACKEND SERVER ONLINE", flush=True)
    print("="*65, flush=True)
    print(f"  * App Name:            {settings.app_name}", flush=True)
    print(f"  * Database Engine:     PostgreSQL ({settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db})", flush=True)
    print(f"  * AWS S3 Bucket:       {settings.aws_s3_bucket or 'Not Configured (In-Memory Fallback)'}", flush=True)
    print(f"  * Snowflake Warehouse: {settings.snowflake_warehouse or 'Not Configured (Auto-Skip)'}", flush=True)
    print(f"  * Upload UI Portal:    http://localhost:8000/upload-ui", flush=True)
    print(f"  * API Documentation:   http://localhost:8000/docs", flush=True)
    print("="*65 + "\n", flush=True)


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

