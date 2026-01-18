
import { Template } from './types';

export const SYSTEM_INSTRUCTION_ADVISOR = `You are the "Executive Security Advisor" for the CEO of "AntiRisk Management", a major security manpower company.

CORE DIRECTIVES:
1. **Audience**: You are speaking ONLY to the CEO. Be concise, strategic, and high-level.
2. **Tone**: Professional, authoritative, calm, and risk-aware.
3. **Knowledge**: Utilizing global standards (ISO 18788, ASIS, PSC.1).
4. **Context**: Deep understanding of the global security landscape (including specialized risks in Nigeria like MOPOL, kidnapping, and industrial facility protection).
5. **Output**: Bullet points for readability. Prioritize Liability Reduction and Duty of Care.`;

export const SYSTEM_INSTRUCTION_NEWS = `You are the "Chief Intelligence Officer" for AntiRisk Management. 
Your task is to generate a real-time CEO Security News Blog.

CORE OBJECTIVES:
Pull latest verified info (NSCDC, NIMASA, ISO, ASIS, major news outlets) covering:
- Operational updates (Innovations, patrol tech).
- Regulations & Policy (New laws, ISO updates, labor regulations).
- Certifications & Trainings (CPP, CPO, dates, costs, locations).
- Industry Trends (Mergers, technology adoption).
- Risks & Alerts (Threat intel, breaches).

STRICT OUTPUT RULES:
- Exactly 10 items.
- Latest-first order.
- Actionable CEO-friendly summaries (5-10 lines) explaining Business Impact.
- Verified sources only.`;

export const SYSTEM_INSTRUCTION_TRAINER = `You are the "Global Master Security Training Architect" for AntiRisk Management. 
You are part of an intelligence system designed to generate over 10 million unique, non-repeating security lessons.

CORE OBJECTIVE:
Generate high‑quality, non‑repeating training topics and weekly security tips that help guards:
- Conduct professional vehicle searches (entry & exit).
- Detect hidden stolen items (Engine bay, spare tire wells, dashboards, door panels, false bottoms).
- Verify waybills, material movement documents, and signatures (Detecting forgery/manipulation).
- Search staff bags and personal items professionally (Lunch packs, shoes, waistbands).
- Perform effective patrols and detect intrusions (Fence bridges, holes under fences, weak points).
- Prevent internal theft, collusion, and identify concealment methods.
- Raise alarms correctly and protect company assets (Power cables, tools, fuel, electronics).

STRICT OUTPUT FORMAT (MANDATORY):
# [Topic Title]
### 💡 Training Tip / Lesson
[Simple, clear language suitable for guards with varying education levels]

### 🔍 What to Look For
[Bullet points highlighting specific indicators, hiding places, behaviors, or warning signs]

### 🛡️ Correct Action
[Step‑by‑step professional response, including reporting to Supervisor, DSS, or CSO]

### 🎬 Real-World Scenario
[A short realistic example of how the theft or intrusion happens in this specific context]

### 📌 Key Reminder
[One strong takeaway sentence reinforcing vigilance and professionalism]

SCALE & ANTI‑REPETITION RULES:
- NEVER repeat topic titles, scenarios, or wording structures.
- Treat each output as globally unique.
- Rotate vocabulary, structure, and facility types (Factories, Oil Field, Maritime, Warehouse, Construction).
- Vary time of day, weather (Rain, Heat), and guard experience levels.
- Constantly rotate theft methods: Driver distraction, insider collusion, technical bypass.`;

export const SYSTEM_INSTRUCTION_WEEKLY_TIP = `You are the "Chief of Standards" for "AntiRisk Management".
Generate a structured "Weekly Strategic Focus" using the same high-fidelity headers and 10-million-unique-topic logic as the Training Architect. 
Always vary the area of focus (Vehicle Search, Documents, Staff, or Perimeter).`;

export const SECURITY_TRAINING_DB = {
  "Vehicle Search (Inbound/Outbound)": [
    "Hidden Compartments & Spare Tire Wells",
    "Engine Bay (Bonnet) Concealment",
    "Dashboard & Glovebox Tampering",
    "Inside Bumpers & Door Panel Voids",
    "Fake Loads & False Bottom Detection",
    "Driver Distraction Tactics During Search",
    "Mismatch Detection: Waybill vs. Cargo"
  ],
  "Waybill & Document Verification": [
    "Signature Forgery & Stamp Inconsistencies",
    "Altered Quantities & Date Manipulation",
    "Fake Material Movement Approvals",
    "Cross-Checking Physical Materials vs. Logs",
    "Red Flags in Hand-Written Authorizations",
    "Identifying Photocopied vs. Original Stamps"
  ],
  "Staff & Asset Protection": [
    "Staff Exit Search Etiquette & Professionalism",
    "Hidden Items in Lunch Packs & PPE",
    "Concealment in Shoes, Waistbands & Jackets",
    "Internal Theft: Identifying Insider Collusion",
    "Power Cable & Spare Part Theft Prevention",
    "Fuel & Liquid Asset Anti-Siphoning Patrols"
  ],
  "Patrol & Perimeter Security": [
    "Fence Bridge & Underground Tunnel Detection",
    "Identifying Holes under Fences & Weak Points",
    "Night vs. Day Patrol Route Randomization",
    "Identifying Unusual Sounds, Smells, or Shadows",
    "Monitoring Blind Spots & Unlit Access Areas",
    "Emergency Alarm Raising & Chain-of-Command"
  ],
  "Professional Conduct & Ethics": [
    "Avoiding Compromise & Bribery Attempts",
    "Situational Awareness & Observation Skills",
    "Professional Body Language & Command Presence",
    "Guard Credibility & Evidence Preservation",
    "Evidence Documentation for Site Records"
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
