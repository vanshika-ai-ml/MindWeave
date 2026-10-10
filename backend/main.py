import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database.connection import init_db
from backend.api.routes import sessions, questions, evaluation, revision, progress

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mindweave")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing MindWeave database tables...")
    init_db()
    logger.info(f"MindWeave backend ready. Model: {settings.GEMINI_MODEL}")
    yield
    logger.info("MindWeave backend shutting down.")

app = FastAPI(
    title="MindWeave API",
    description="AI-Powered Personalized Learning & Understanding Platform Backend",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
origins = settings.cors_origins or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "MindWeave API",
        "version": "2.0.0",
        "model": settings.GEMINI_MODEL,
        "database": settings.DATABASE_URL.split("://")[0]
    }

# Register API Routers
app.include_router(sessions.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(evaluation.router, prefix="/api")
app.include_router(revision.router, prefix="/api")
app.include_router(progress.router, prefix="/api")
