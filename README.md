# Inixa Studio

**Unified AI Intelligence Workspace** — Chat, Image, Video, Music, Research, Coding & more in one place.

Version **8.5 Production**  
Live: [ai-studio-inixa.vercel.app](https://ai-studio-inixa.vercel.app)

---

## Overview

Inixa Studio is a full-featured AI creative platform built with modern web technologies. It combines multi-model conversational AI, document intelligence, generative media tools, research agents, and a coding workspace into a single polished interface — available on web and Android.

---

## Features

| Module | Description |
|--------|-------------|
| **Neural Chat** | Multi-model chat (Grok, GPT, Claude, Gemini and more) with streaming responses |
| **Arena** | Side-by-side dual LLM comparison |
| **Deep Research** | Automated multi-step research agent with web access |
| **Web Auto-Pilot** | Browser automation agent (Beta) |
| **PDF Chat (RAG)** | Upload and query documents with retrieval-augmented generation |
| **NOTE-IX** | AI-powered notes studio |
| **Imagine** | High-quality text-to-image generation |
| **Video** | Text-to-video generation |
| **Neural Music** | AI music generation (Suno-style) |
| **Voice** | Voice assistant with TTS / transcription |
| **Vibe Studio** | Desktop coding workspace with live previews |
| **Claude Code** | CLI setup & integration helpers |
| **API Console** | Developer tools and API key management |
| **Artifacts** | Interactive code sandboxes, charts & previews |
| **Android App** | Native Capacitor wrapper + APK distribution |

Additional ecosystem apps:
- **Echo Music** — Ad-free, offline-capable music player (APK)
- **Inixa AI Companion** — Mobile version of the studio (APK)

---

## Tech Stack

**Frontend**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS + Framer Motion
- Radix UI primitives

**AI & Backend**
- Vercel AI SDK
- Multiple model providers & free LLM proxies
- Document parsing (PDF, DOCX, etc.)
- Web search / scrape utilities
- Presenton integration (presentations)

**Mobile**
- Capacitor 8 (Android)
- App ID: `com.inixa.app`

**Infra / Tooling**
- Docker Compose (free LLM API proxies)
- Firebase config present
- Vercel deployment ready

---

## Project Structure (High Level)

```
AI-STUDIO-INIXA/
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── (chat)/
│   │   ├── api/             # chat, generate-image, suno, tts, web-search, etc.
│   │   ├── admin/
│   │   └── ...
│   ├── components/          # UI + feature modules
│   │   ├── ChatInterface.tsx
│   │   ├── Generators.tsx   # Image & Video
│   │   ├── MusicStudio.tsx
│   │   ├── DeepResearchAgent.tsx
│   │   ├── AutoPilotAgent.tsx
│   │   ├── Sidebar.tsx
│   │   ├── vibe/            # Vibe Code Studio
│   │   └── ...
│   ├── api/                 # Client-side AI engine helpers
│   ├── lib/
│   └── utils/
├── android/                 # Capacitor Android project
├── api/                     # Standalone Python helpers (gpt6, pplx, etc.)
├── inixa-veo-backend/
├── docker-compose.yml       # Free LLM proxy services
├── capacitor.config.ts
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm / bun
- (Optional) Docker — for local free LLM proxy stack

### Install & Run

```bash
# Clone
git clone https://github.com/keerthan4531-a11y/AI-STUDIO-INIXA.git
cd AI-STUDIO-INIXA

# Install dependencies
npm install

# Development (Next.js + Vibe engine)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

### Android (Capacitor)

```bash
# After building the web assets
npx cap sync android
npx cap open android
```

The production web app is pointed at `https://ai-studio-inixa.vercel.app` in `capacitor.config.ts`.

### Docker (Optional Free LLM Proxies)

```bash
docker compose up -d
```

See `docker-compose.yml` for services (Qwen, Kimi, GLM, Step, Spark, Metaso, Presenton).

---

## Environment / Configuration Notes

- Model selection and some keys are managed at runtime / via UI.
- Local storage is used heavily for sessions, user data and chat history.
- Free / proxy-based model access is used in several places — reliability depends on upstream providers.
- Review `.gitignore` and never commit real secrets or tokens.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js + Vibe engine concurrently |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
| `npm run vibe-engine` | Run Vibe Studio backend only |

---

## Author

Built by **keerthan** ([@keerthan4531-a11y](https://github.com/keerthan4531-a11y))  
AI/ML Engineer · Full Stack Developer

---

## License

Private / All rights reserved (unless otherwise stated by the author).

---

> **Note:** This README documents the current production feature set of Inixa Studio. Some experimental modules (Auto-Pilot, certain free providers) may change or require additional setup.
