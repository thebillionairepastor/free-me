# AntiRisk | CEO Security Advisory Platform

**AntiRisk** is a high-fidelity, AI-powered command center designed for CEOs and Managing Directors of security manpower firms. It integrates global security standards (ISO 18788, ASIS) with advanced Gemini AI to provide strategic oversight, operational intelligence, and training automation.

## 🛡️ Core Modules

- **AI Executive Advisor**: A direct line to a strategic security consultant trained on global and regional (Nigeria/West Africa) risk landscapes.
- **Intel Engine (Training Builder)**: Access to a repository of over 10-million training "vibrations"—unique, role-specific tactical briefings.
- **Ops Vault**: A secure repository for tactical SOPs and AI-driven Risk Audit of guard logs and incident reports.
- **CEO News Blog**: Real-time regulatory updates from NSCDC, NIMASA, and ISO boards.
- **Offline-First Vault**: Progressive Web App (PWA) architecture ensuring access to critical protocols even in zero-connectivity environments.

## 🚀 Deployment

The application is optimized for deployment on **Netlify**.

### 1. Environment Configuration
You MUST set the following environment variable in your Netlify site settings:

| Key | Value |
| :--- | :--- |
| `API_KEY` | Your Google Gemini API Key |

### 2. Deployment Steps
1. Push this repository to GitHub.
2. Connect the repository to **Netlify**.
3. Netlify will automatically detect the settings from `netlify.toml`.
4. Ensure the build command is `npm run build` and the output directory is `dist`.
5. Add the `API_KEY` variable in the **Site settings > Build & deploy > Environment** section.

## 🔒 Security Architecture

- **PIN-Protected Vault**: Security-first access control for executive data.
- **Offline Intelligence**: Local caching of "Ops Vault" intelligence for zero-latency access during field operations.
- **Data Privacy**: All AI consultations are session-based; internal policies are injected as context locally.

## 🛠️ Tech Stack

- **Framework**: React 19 (ESM)
- **AI**: Google Gemini API (@google/genai)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite 6.0
- **Hosting**: Netlify (Edge Functions & Optimized Headers)

---
**AntiRisk Management**
*Empowering Security Leadership with High-Fidelity Intelligence.*
