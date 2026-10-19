<div align="center">

# ⚡ Inixa Studio

### The Unified AI Intelligence Workspace

**Chat · Image · Video · Music · Research · Code — all in one place**

[![Live Demo](https://img.shields.io/badge/Live-ai--studio--inixa.vercel.app-indigo?style=for-the-badge&logo=vercel)](https://ai-studio-inixa.vercel.app)
[![Version](https://img.shields.io/badge/Version-8.5_Production-blueviolet?style=for-the-badge)](https://github.com/keerthan4531-a11y/AI-STUDIO-INIXA)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Capacitor](https://img.shields.io/badge/Android-Capacitor_8-3DD68C?style=for-the-badge&logo=android)](https://capacitorjs.com)

<br/>

**One workspace. Every AI superpower.**

[🚀 Open Live App](https://ai-studio-inixa.vercel.app) · [📦 View Source](https://github.com/keerthan4531-a11y/AI-STUDIO-INIXA)

</div>

---

## ✨ What is Inixa?

Inixa Studio is a **premium all-in-one AI platform** that brings together conversational intelligence, generative media, deep research, and coding tools into a single beautifully designed interface.

Built for creators, students, developers and power users who want **everything AI** without jumping between 10 different apps.

---

## 🧠 Core Features

<table>
<tr>
<td width="50%">

### 💬 Intelligence
- **Neural Chat** — Multi-model streaming (Grok, GPT, Claude, Gemini…)
- **Arena** — Side-by-side dual LLM battles
- **Deep Research** — Autonomous multi-step research agent
- **Web Auto-Pilot** — Browser automation (Beta)
- **PDF Chat (RAG)** — Talk to your documents
- **NOTE-IX** — AI-powered notes studio

</td>
<td width="50%">

### 🎨 Creation
- **Imagine** — High-fidelity text-to-image
- **Video** — Text-to-video generation
- **Neural Music** — AI music studio (Suno-style)
- **Voice** — Voice assistant + TTS
- **Artifacts** — Live code sandboxes & charts
- **Vibe Studio** — Elite desktop coding workspace

</td>
</tr>
</table>

### 🛠️ Developer & Mobile
- **API Console** — Keys, stats & developer tools
- **Claude Code** — CLI setup helpers
- **Android APK** — Native Capacitor app ready to install
- **Echo Music** — Bonus ad-free music player APK

---

## 🖼 Preview

> Dark glass UI · Smooth animations · Desktop + Mobile optimized

```
┌─────────────────────────────────────────────────────┐
│  Inixa  │  Chat  Arena  Research  Imagine  Video … │
├─────────┴───────────────────────────────────────────┤
│                                                     │
│     ✨  Multi-model chat with streaming replies     │
│     🎨  Image & Video generation side-by-side       │
│     🎵  Neural Music + Voice tools                  │
│     📄  PDF RAG · Deep Research · Auto-Pilot        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 16 · React 19 · TypeScript · Tailwind CSS · Framer Motion · Radix UI |
| **AI** | Vercel AI SDK · Multi-provider routing · Document parsing · Web search/scrape |
| **Mobile** | Capacitor 8 (`com.inixa.app`) |
| **Infra** | Vercel · Docker Compose (free LLM proxies) · Firebase config |

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/keerthan4531-a11y/AI-STUDIO-INIXA.git
cd AI-STUDIO-INIXA

# 2. Install
npm install

# 3. Run
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** and start creating.

<details>
<summary><b>📦 More commands</b></summary>

```bash
# Production build
npm run build && npm start

# Android (after web build)
npx cap sync android
npx cap open android

# Optional: free LLM proxy stack
docker compose up -d
```

</details>

---

## 📂 Project Structure

```text
AI-STUDIO-INIXA/
├── src/
│   ├── app/                  # Pages + API routes
│   │   ├── api/              # chat · image · video · music · research …
│   │   └── ...
│   ├── components/           # UI + Agents
│   │   ├── ChatInterface.tsx
│   │   ├── Generators.tsx
│   │   ├── MusicStudio.tsx
│   │   ├── DeepResearchAgent.tsx
│   │   ├── AutoPilotAgent.tsx
│   │   ├── vibe/             # Vibe Code Studio
│   │   └── ...
│   ├── lib/ & utils/
├── android/                  # Capacitor Android project
├── docker-compose.yml        # Free LLM proxies + Presenton
├── capacitor.config.ts
└── package.json
```

---

## 📱 Mobile Apps

| App | Description | Size |
|-----|-------------|------|
| **Inixa AI Companion** | Full studio wrapped as native Android app | ~4 MB |
| **Echo Music** | Ad-free, offline music player with lossless engine | ~82 MB |

Both available as direct APKs from the in-app **About** section.

---

## ⚠️ Notes

- Some models rely on free / proxy providers — availability can vary.
- Local storage is used for sessions and chat history.
- Never commit real API keys or tokens.
- Experimental features (Auto-Pilot etc.) may require extra setup.

---

<div align="center">

### Built with ⚡ by **keerthan**

[GitHub](https://github.com/keerthan4531-a11y) · [Live App](https://ai-studio-inixa.vercel.app)

**Inixa Studio** — One workspace. Every AI superpower.

</div>
