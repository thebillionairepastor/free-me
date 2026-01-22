import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION_ADVISOR, SYSTEM_INSTRUCTION_TRAINER, SYSTEM_INSTRUCTION_WEEKLY_TIP, SYSTEM_INSTRUCTION_NEWS } from "../constants";
import { ChatMessage, StoredReport, KnowledgeDocument, WeeklyTip } from "../types";

/**
 * World-class Gemini SDK implementation optimized for high-speed executive performance.
 * Model Selection: 'gemini-3-flash-preview' is the definitive choice for speed.
 */
const PRIMARY_MODEL = 'gemini-3-flash-preview';

/**
 * Robust Retry Utility with Exponential Backoff
 * Engineered to handle RESOURCE_EXHAUSTED (429) errors typical in high-traffic free tier deployments.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 5000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorString = JSON.stringify(error).toUpperCase();
    const isQuotaError = 
      errorString.includes('RESOURCE_EXHAUSTED') || 
      errorString.includes('429') || 
      errorString.includes('QUOTA') ||
      errorString.includes('LIMIT');

    if (isQuotaError && retries > 0) {
      console.warn(`[AntiRisk Vault] Intelligence link saturated. Re-establishing link in ${delay}ms... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Exponential backoff: increase wait time to give the API quota window time to reset
      return withRetry(fn, retries - 1, delay * 1.5); 
    }
    
    // Log fatal errors for debugging but re-throw to be handled by the UI
    console.error("[AntiRisk Vault] Fatal Intelligence Failure:", error);
    throw error;
  }
}

/**
 * Real-time Security News Blog Service
 */
export const fetchSecurityNews = async (): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Generate the Latest CEO Security News Blog for today.
    Focus:
    1. Verified updates from NSCDC, NIMASA, ISO, and Global Security Trends.
    2. Business impact on physical security and manpower supply.
    3. Exactly 10 latest items in professional Markdown.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_NEWS,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 } // Zero latency configuration
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return { 
      text: response.text || "Intelligence stream temporarily offline.",
      sources: sources.length > 0 ? sources : undefined
    };
  });
};

/**
 * Topic Suggestion Engine
 */
export const fetchTopicSuggestions = async (query: string): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Provide 10 specific security training topic variations for: "${query}". Return ONLY a JSON array of strings.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return JSON.parse(response.text || "[]");
  });
};

/**
 * Tactical Training Module Generator
 */
export const generateTrainingModule = async (topic: string, week: number = 1, role: string = "All Roles"): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `COMMAND: Generate a unique vibration of the objective: "${topic}".
    PROGRESSION: Week ${week}
    ROLE: ${role}
    Include mandatory CEO/MD signature.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_TRAINER,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return { 
      text: response.text || "Tactical brief generation failed.",
      sources: sources.length > 0 ? sources : undefined
    };
  });
};

/**
 * Weekly Strategic Directive Generator
 */
export const generateWeeklyTip = async (previousTips: WeeklyTip[]): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Generate a new "Weekly Strategic Focus" directive. Use mandatory advisor signature.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION_WEEKLY_TIP,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Remain alert and maintain perimeter integrity.";
  });
};

/**
 * Executive Advisor Interface
 */
export const generateAdvisorResponse = async (
  history: ChatMessage[], 
  currentMessage: string,
  knowledgeBase: KnowledgeDocument[] = []
): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const conversationContext = history.slice(-5).map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `CONTEXT:\n${conversationContext}\n\nCEO QUERY: ${currentMessage}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_ADVISOR,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return { 
      text: response.text || "Vault link recalibrating. Please repeat the query.",
      sources: sources.length > 0 ? sources : undefined
    };
  });
};

/**
 * Best Practices Retrieval
 */
export const fetchBestPractices = async (topic?: string): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const finalTopic = topic && topic.trim() !== "" 
      ? topic 
      : "latest physical security industrial best practices and regulatory shifts for 2025.";

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Audit and Retrieve: "${finalTopic}". Focus on strategic compliance.`,
      config: { 
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return { 
      text: response.text || "Intelligence stream saturated. Reconnecting...",
      sources: sources.length > 0 ? sources : undefined
    };
  });
};

/**
 * Dispatch Log Intelligence Analysis
 */
export const analyzeReport = async (reportText: string, previousReports: StoredReport[] = []): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Identify patterns and vulnerabilities in this dispatch log: ${reportText}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Analysis engine currently recalibrating.";
  });
};

/**
 * Patrol Route Optimization Analysis
 */
export const analyzePatrolPatterns = async (reports: StoredReport[]): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = reports.map(r => r.content).slice(0, 10).join('\n---\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Analyze these historical security reports and suggest optimized patrol routes, timing, and frequencies to address recurring vulnerabilities. Focus on high-deterrence strategies:\n\n${context}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Patrol optimization engine currently recalibrating.";
  });
};

/**
 * Automated Training Suggestions from Data
 */
export const getTrainingSuggestions = async (recentReports: StoredReport[]): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = recentReports.map(r => `- ${r.content}`).join('\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Suggest 3 training topics based on these incidents, separated by |||:\n${context}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return (response.text || "").split('|||').map(t => t.trim());
  });
};