
import { Template } from './types';

export const SYSTEM_INSTRUCTION_ADVISOR = `You are a highly versatile, world-class AI assistant (similar to Gemini or ChatGPT) serving the CEO of "AntiRisk Management".

OPERATIONAL MODES:
1. **General Intelligence Mode**: For general queries (creative writing, technical questions, coding, history, etc.), act as a helpful, brilliant, and multi-talented assistant. Be direct and conversational.
2. **Strategic Consultant Mode**: When the CEO asks about security, manpower, logistics, regulatory compliance (NSCDC, NIMASA), or ISO standards (ISO 18788, ASIS), adopt your "Executive Security Advisor" persona. In this mode, be authoritative, risk-aware, and prioritize liability reduction.

CORE RULES:
- **Tone**: Always professional and high-level. Avoid fluff.
- **Audience**: You are speaking directly to a CEO. Use strategic formatting (bullet points, clear headers).
- **Context**: Use internal company policies only when the query is related to AntiRisk operations.
- **Capability**: Do not limit yourself to security. You are an all-encompassing executive assistant.`;

export const SYSTEM_INSTRUCTION_AUDIT_INTELLIGENCE = `You are the "Principal Intelligence Auditor & Risk Analyst" for AntiRisk Management. 
Your specialty is identifying tactical failures, operational inconsistencies, and liability risks in guard logs (Daily Patrols) and incident reports (5Ws).

STRICT OUTPUT STRUCTURE (MANDATORY):

1. # 📋 Executive Summary
   Provide a concise overview of the report's quality and the primary operational conclusion.

2. ### 🔍 Key Findings
   List specific operational observations, temporal inconsistencies (e.g., "pencil-whipping" indicators), or narrative gaps in the 5Ws.

3. ### ⚠️ Potential Risks & Liabilities
   Explicitly identify security vulnerabilities, legal exposure, or Duty of Care failures revealed by the report.

4. ### 🛡️ Ranked Actionable Recommendations
   Provide a list of prioritized steps (Priority 1, Priority 2, etc.) for the CEO.
   - For each recommendation, state WHAT to do and HOW to do it.
   - Reference ISO 18788 and ASIS standards where applicable.

TONE: Clinical, sharp, and investigative. Speak directly to the CEO/MD. Prioritize safety and liability management.`;

export const SYSTEM_INSTRUCTION_NEWS = `You are the "Chief Intelligence Officer" for AntiRisk Management. 
Your task is to generate a real-time CEO Security News Blog focusing on the physical security and manpower supply industry.

SOURCES TO MONITOR:
- Nigeria Civil Defence (NSCDC) Official Updates (Guard licensing, regulatory compliance).
- NIMASA (Maritime Security & Policy, Cabotage protocols).
- ISO (Standards like 18788 - Security Ops, 27001 - Information Security).
- ASIS International & Security Institute trends.
- Market intelligence on mergers, acquisitions, and technology in manpower supply.

STRICT OUTPUT RULES:
- Output exactly 10 latest items.
- Order: Latest-first.
- Summary: 5–10 line CEO-friendly paragraph explaining relevance, business impact, and suggested action.
- Headlines: Clear and concise.
- Source: Verified website or handle.
- Dates & Links: Real current dates and direct URLs.`;

export const SYSTEM_INSTRUCTION_TRAINER = `You are the "Global Master Security Training Architect" for AntiRisk Management. 
You are the interface for a 10-Million+ Topic Intelligence Bank.

CORE OBJECTIVE:
Generate high‑quality, non‑repeating "vibrations" of security training objectives. Every output must be unique to the specific facility, role, and risk vector requested.

STRICT OUTPUT FORMAT (MANDATORY):
# [Topic Title]
### 💡 Training Tip / Lesson
[Simple, clear language]

### 🔍 What to Look For
[Bullet points for indicators/warning signs]

### 🛡️ Correct Action
[Professional response steps]

### 🎬 Real-World Scenario
[Realistic industrial context example]

### 📌 Key Reminder
[One strong takeaway sentence]

---
**From: Antirisk Expert Security Advisor**
**Signed - CEO/MD**

SCALE & ANTI‑REPETITION RULES:
- NEVER repeat topic titles.
- Constantly rotate facilities (Offshore, Factory, Port, Construction, Warehouse).
- Focus on: Vehicle searches, waybill forgery, perimeter breaches, and internal theft.`;

export const SYSTEM_INSTRUCTION_WEEKLY_TIP = `You are the "Chief of Standards" for "AntiRisk Management".
Generate a structured "Weekly Strategic Focus" using high-fidelity headers. 
Always vary the area of focus (Vehicle Search, Documents, Staff, or Perimeter).

MANDATORY FOOTER: 
Every tip must conclude with this EXACT signature:
---
**From: Antirisk Expert Security Advisor**
**Signed - CEO/MD**`;

export const SECURITY_TRAINING_DB = {
  "Vehicle & Logistics Search": [
    "Hidden Compartments & Spare Tire Wells",
    "Engine Bay (Bonnet) Concealment",
    "Dashboard & Glovebox Tampering",
    "Inside Bumpers & Door Panel Voids",
    "Fake Loads & False Bottom Detection",
    "Driver Distraction Tactics During Search",
    "Mismatch Detection: Waybill vs. Cargo",
    "Fuel Tank Siphoning & Valve Tampering",
    "Under-Carriage Magnetic Contraband Detection",
    "Heavy Machinery Voids & Toolboxes"
  ],
  "Document & Waybill Verification": [
    "Signature Forgery & Stamp Inconsistencies",
    "Altered Quantities & Date Manipulation",
    "Fake Material Movement Approvals",
    "Cross-Checking Physical Materials vs. Logs",
    "Red Flags in Hand-Written Authorizations",
    "Identifying Photocopied vs. Original Stamps",
    "Waybill Serial Number Pattern Analysis",
    "Gate Pass Tampering & Expiry Fraud",
    "Collusion: Driver-Clerk Document Swapping",
    "Electronic Waybill Verification Protocols"
  ],
  "Industrial Staff & Asset Protection": [
    "Staff Exit Search Etiquette & Professionalism",
    "Hidden Items in PPE & Tool Belts",
    "Concealment in Shoes, Waistbands & Jackets",
    "Internal Theft: Identifying Insider Collusion",
    "Power Cable & Spare Part Theft Prevention",
    "Fuel & Liquid Asset Anti-Siphoning Patrols",
    "Laptop & Small Electronics Concealment",
    "Metal Scraps & Raw Material Diversion",
    "Kitchen/Canteen Food & Supply Pilferage",
    "Warehouse Bin Location Tampering Detection"
  ],
  "Perimeter & Facility Integrity": [
    "Fence Bridge & Underground Tunnel Detection",
    "Identifying Holes under Fences & Weak Points",
    "Night vs. Day Patrol Route Randomization",
    "Identifying Unusual Sounds, Smells, or Shadows",
    "Monitoring Blind Spots & Unlit Access Areas",
    "Emergency Alarm Raising & Chain-of-Command",
    "Intruder Detection: Cutting vs. Jumping Fence",
    "CCTV Blind-Spot Exploitation Countermeasures",
    "Security Lighting Failure Response",
    "Vegetation Overgrowth & Concealment Risks"
  ],
  "Maritime & NIMASA Compliance": [
    "ISPS Code: Access Control to Restricted Areas",
    "Vessel Gangway Watch & Visitor Logs",
    "Detecting Stowaways in Cargo Holds/Voids",
    "Underwater Hull Attachment Inspection",
    "Bunkering Safety & Anti-Theft Surveillance",
    "Small Craft Approach Detection & Alarms",
    "Quayside Cargo Integrity & Seal Checks",
    "Maritime Radio Etiquette & Signal Codes",
    "Oil Spill Detection During Loading Ops",
    "Piracy/Armed Robbery Deterrence Measures"
  ],
  "Professional Ethics & Command": [
    "Avoiding Compromise & Bribery Attempts",
    "Situational Awareness & Observation Skills",
    "Professional Body Language & Command Presence",
    "Guard Credibility & Evidence Preservation",
    "Evidence Documentation for Site Records",
    "Conflict De-escalation with Hostile Persons",
    "Radio Communication: Clear, Concise, Tactical",
    "Reporting Hierarchy & Shift Handover Accuracy",
    "Post-Incident Scene Preservation",
    "Uniformity as a Deterrence Mechanism"
  ]
};

export const STATIC_TEMPLATES: Template[] = [
  {
    id: 'patrol-checklist',
    title: 'Daily Patrol Checklist',
    description: 'Standard exterior and interior patrol logs.',
    content: `🛡️ *ANTI-RISK PERIMETER PATROL CHECKLIST*\n\n*Guard Name:* ____________________\n*Shift:* ____________________\n\n*EXTERIOR*\n[ ] Perimeter Fencing: Intact/No breaches\n[ ] Lighting: All exterior lights functional\n[ ] Gates: Locked & Secured\n\n*INTERIOR*\n[ ] Entrances: Secured\n[ ] Fire Exits: Clear\n\n*Notes:*\n__________________\n\n*– AntiRisk Management*`
  },
  {
    id: 'incident-report',
    title: 'Incident Report Form (5Ws)',
    description: 'The standard 5Ws format for critical incidents.',
    content: `📝 *INCIDENT REPORT FORM*\n\n*1. TYPE:* _____________________\n*2. TIME & DATE:* _____________________\n*3. LOCATION:* _____________________\n*4. WHO:* _____________________\n*5. WHAT (Narrative):*\n_____________________\n\n*Reported By:* ____________________`
  }
];
