# MetiTrack Frontend — Cleanroom MES Interface

Cleanroom shop-floor interface for patient-specific medical implant manufacturing tracking, built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## Features
- **HIPAA-Masked Patient Case Intake & Triage**
- **5-Station Sequential Cleanroom Kanban Board**
- **Cleanroom Advance Modal with BOM Resource Allocation**
- **WebGL 3D Titanium Mesh Viewport (Three.js)**
- **FDA 21 CFR Part 830 GS1-128 & DataMatrix UDI Label Print Engine**
- **Shop-Floor WIP Telemetry & Resource Analytics Dashboard**
- **High-Density Master Manufacturing Queue Table with Sanitized CSV Export**
- **Real-Time Security & Compliance Audit Stream**

## Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional, defaults to http://localhost:8000/api or 8001/api)
cp .env.example .env.local

# 3. Start local development server (Port 3001)
npm run dev -- -p 3001

# Or build for production
npm run build
npm run start -- -p 3001
```
