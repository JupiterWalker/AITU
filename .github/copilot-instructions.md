# Copilot Instructions for AITU

## Overview

This project is a full-stack application with a React + TypeScript + Vite frontend and a FastAPI backend. The backend leverages LangChain and SiliconFlow for LLM integration. The codebase is organized for rapid prototyping and experimentation with LLM-powered chat and knowledge graph features.

## Architecture

- **Frontend** (`src/`):
  - Built with React, TypeScript, and Tailwind CSS.
  - Main entry: `src/main.tsx`, root component: `src/App.tsx`.
  - Core UI components: `src/components/ChatBox.tsx`, `KnowledgeGraph.tsx`, etc.
  - API communication: `src/service.ts` (calls backend at `http://127.0.0.1:8000`).
- **Backend** (`backend/`):
  - FastAPI app (`main.py`) exposes REST endpoints, including `/ask` for LLM Q&A.
  - LLM integration via `backend/llm/model.py` (SiliconFlow, LangChain, OpenAI models).
  - In-memory data structures for chat context; can be swapped for persistent storage.
  - Environment variables loaded from `.env` in `backend/llm/`.

## Developer Workflows

- **Frontend**
  - Start dev server: `npm run dev`
  - Build: `npm run build`
  - Lint: `npm run lint`
  - Preview: `npm run preview`
- **Backend**
  - Run API: `cd backend && uvicorn main:app --reload`
  - Python dependencies managed via `pdm` or `requirements.txt`.
  - LLM API keys set in `backend/llm/.env` (not committed).

## Conventions & Patterns

- Use TypeScript for all frontend code.
- Use Pydantic models for FastAPI request/response schemas.
- All backend routes are defined in routers (e.g., `chat_router` in `chat.py`).
- LLM model selection is centralized in `llm/model.py`.
- CORS is enabled for all origins by default (see `main.py`).
- Frontend expects backend at `http://127.0.0.1:8000` (update if deploying).

## Integration Points

- Frontend <-> Backend: REST API (see `src/service.ts` and backend `/ask` endpoint).
- Backend <-> LLM: LangChain + SiliconFlow API (see `llm/model.py`).
- Environment variables: `.env` for sensitive keys (never commit).

## Examples

- To add a new LLM model, update `llm/model.py` and ensure the API key is set in `.env`.
- To add a new API endpoint, create a new router in `backend/`, register it in `main.py`, and update `src/service.ts` if needed.

---

For more details, see `README.md` and code comments in key files. If anything is unclear or missing, please provide feedback for improvement.
