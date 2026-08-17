import sys
import time
import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# PATH CONFIGURATION
# ============================================================

# Ensure project root and backend are in sys.path
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent

for p in [str(project_root), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)


# ============================================================
# LOGGING CONFIGURATION
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("voila.backend")


# ============================================================
# IMPORT ROUTERS
# ============================================================

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


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title=settings.app_name
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",

        "http://localhost:5174",
        "http://127.0.0.1:5174",

        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],

    # Allow any localhost / 127.0.0.1 port
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REAL-TIME HTTP REQUEST LOGGING MIDDLEWARE
# ============================================================

@app.middleware("http")
async def log_requests_to_terminal(
    request: Request,
    call_next
):
    """
    Logs every incoming HTTP request and outgoing HTTP response.

    Example:

    >> [HTTP IN]  POST /api/upload from 127.0.0.1
    << [HTTP OUT] [OK] 200 POST /api/upload (842.3ms)
    """

    start_time = time.time()

    # --------------------------------------------------------
    # Request information
    # --------------------------------------------------------

    client_ip = (
        request.client.host
        if request.client
        else "unknown"
    )

    method = request.method
    url_path = request.url.path

    query = str(request.query_params)

    full_path = (
        f"{url_path}?{query}"
        if query
        else url_path
    )

    # --------------------------------------------------------
    # INCOMING REQUEST LOG
    # --------------------------------------------------------

    print(
        f"\n>> [HTTP INCOMING] "
        f"{method} {full_path} "
        f"| IP: {client_ip}",
        flush=True
    )

    try:

        # ----------------------------------------------------
        # Process request
        # ----------------------------------------------------

        response = await call_next(request)

        # ----------------------------------------------------
        # Calculate response time
        # ----------------------------------------------------

        duration_ms = (
            time.time() - start_time
        ) * 1000.0

        status = response.status_code

        # ----------------------------------------------------
        # Status marker
        # ----------------------------------------------------

        if status < 300:
            status_marker = "[SUCCESS]"

        elif status < 400:
            status_marker = "[REDIRECT]"

        elif status < 500:
            status_marker = "[CLIENT ERROR]"

        else:
            status_marker = "[SERVER ERROR]"

        # ----------------------------------------------------
        # OUTGOING RESPONSE LOG
        # ----------------------------------------------------

        print(
            f"<< [HTTP OUTGOING] "
            f"{status_marker} {status} "
            f"{method} {url_path} "
            f"| {duration_ms:.2f} ms",
            flush=True
        )

        return response

    except Exception as exc:

        # ----------------------------------------------------
        # Exception timing
        # ----------------------------------------------------

        duration_ms = (
            time.time() - start_time
        ) * 1000.0

        # ----------------------------------------------------
        # ERROR LOG
        # ----------------------------------------------------

        print(
            f"<< [HTTP ERROR] "
            f"500 {method} {url_path} "
            f"| {duration_ms:.2f} ms "
            f"| {type(exc).__name__}: {exc}",
            flush=True
        )

        raise


# ============================================================
# STARTUP DIAGNOSTICS
# ============================================================

@app.on_event("startup")
def startup_banner():

    print(
        "\n" + "=" * 65,
        flush=True
    )

    print(
        "  VOILA ANALYTICS BACKEND SERVER ONLINE",
        flush=True
    )

    print(
        "=" * 65,
        flush=True
    )

    print(
        f"  * App Name:            "
        f"{settings.app_name}",
        flush=True
    )

    print(
        f"  * Database Engine:     "
        f"PostgreSQL "
        f"({settings.postgres_host}:"
        f"{settings.postgres_port}/"
        f"{settings.postgres_db})",
        flush=True
    )

    print(
        f"  * AWS S3 Bucket:       "
        f"{settings.aws_s3_bucket or 'Not Configured (In-Memory Fallback)'}",
        flush=True
    )

    print(
        f"  * Snowflake Warehouse: "
        f"{settings.snowflake_warehouse or 'Not Configured (Auto-Skip)'}",
        flush=True
    )

    print(
        "  * Upload UI Portal:    "
        "http://localhost:8000/upload-ui",
        flush=True
    )

    print(
        "  * API Documentation:   "
        "http://localhost:8000/docs",
        flush=True
    )

    print(
        "=" * 65 + "\n",
        flush=True
    )

    # --------------------------------------------------------
    # Non-blocking background pre-warming
    # --------------------------------------------------------
    import threading

    def _prewarm_background():
        try:
            from backend.config.db import get_db_connection
            with get_db_connection() as conn:
                pass
        except Exception:
            pass
        try:
            from backend.rag.vector_search import _get_embedding_model
            _get_embedding_model()
            print("[Startup Optimizer] Embedding model pre-warmed in background.", flush=True)
        except Exception as e:
            print(f"[Startup Optimizer] Model pre-warm notice: {e}", flush=True)

    threading.Thread(target=_prewarm_background, daemon=True).start()


# ============================================================
# INCLUDE ROUTERS
# ============================================================

app.include_router(auth_router)

app.include_router(upload_router)

app.include_router(analytics_router)

app.include_router(rag_router)

app.include_router(agent_router)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    """
    Lightweight backend health check endpoint.
    """

    return {
        "status": "ok",
        "app": settings.app_name
    }


# ============================================================
# UPLOAD UI
# ============================================================

@app.get("/", response_class=HTMLResponse)
@app.get("/upload-ui", response_class=HTMLResponse)
def upload_ui():
    """
    Serves the Upload Portal & Metrics UI.
    """

    html_path = (
        backend_dir
        / "static"
        / "upload_ui.html"
    )

    if html_path.exists():

        with open(
            html_path,
            "r",
            encoding="utf-8"
        ) as f:

            return f.read()

    return (
        "<h1>"
        "Voila Voice-of-Customer & Analytics Portal"
        "</h1>"
    )