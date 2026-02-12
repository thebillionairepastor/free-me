
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION_ADVISOR, SYSTEM_INSTRUCTION_TRAINER, SYSTEM_INSTRUCTION_WEEKLY_TIP, SYSTEM_INSTRUCTION_NEWS, SYSTEM_INSTRUCTION_AUDIT_INTELLIGENCE } from "../constants";
import { ChatMessage, StoredReport, KnowledgeDocument, WeeklyTip } from "../types";

// gemini-3-flash-preview is the recommended model for high-performance text tasks
const ADVISOR_MODEL = 'gemini-3-flash-preview';
const PRIMARY_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

/**
 * Optimized Retry Utility
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorString = JSON.stringify(error).toUpperCase();
    const isQuotaError = 
      errorString.includes('RESOURCE_EXHAUSTED') || 
      errorString.includes('429') || 
      errorString.includes('QUOTA');

    if (isQuotaError && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2); 
    }
    throw error;
  }
}

/**
 * Efficient KB Context Retrieval
 */
function getRelevantContext(query: string, knowledgeBase: KnowledgeDocument[]): string {
  if (!knowledgeBase.length) return "No internal policies provided.";
  
  const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 3);
  const relevantDocs = knowledgeBase.filter(doc => {
    const content = (doc.title + " " + doc.content).toLowerCase();
    return queryTerms.some(term => content.includes(term));
  });

  const sourcePool = relevantDocs.length > 0 ? relevantDocs : knowledgeBase.slice(0, 3);
  return sourcePool.map(doc => `[POLICY: ${doc.title}]\n${doc.content}`).join('\n\n');
}

/**
 * Streaming Advisor Response
 */
export async function* generateAdvisorResponseStream(
  history: ChatMessage[], 
  currentMessage: string,
  knowledgeBase: KnowledgeDocument[] = []
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = getRelevantContext(currentMessage, knowledgeBase);
  const conversationContext = history.slice(-6).map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');
  
  const prompt = `INTERNAL POLICIES:\n${context}\n\nCONVERSATION HISTORY:\n${conversationContext}\n\nCEO QUERY: ${currentMessage}`;

  const result = await ai.models.generateContentStream({
    model: ADVISOR_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_ADVISOR,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  for await (const chunk of result) {
    yield chunk.text || "";
  }
}

/**
 * Intelligence Services
 */
export const fetchSecurityNews = async (): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const prompt = `Latest CEO Security News for today, ${today}. Exactly 10 items. Focus on NSCDC, NIMASA, and ISO.`;

    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_NEWS,
        tools: [{ googleSearch: {} }]
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({ title: chunk.web.title, url: chunk.web.uri })) || [];

    return { text: response.text || "", sources };
  });
};

export const fetchBestPractices = async (topic?: string): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const finalTopic = topic && topic.trim() !== "" ? topic : "latest physical security best practices May 2025";

    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Global Trend Audit: "${finalTopic}".`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({ title: chunk.web.title, url: chunk.web.uri })) || [];

    return { text: response.text || "", sources };
  });
};

export const generateTrainingModule = async (topic: string, week: number = 1, role: string = "All Roles"): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Generate training for: "${topic}". Week ${week}. Role: ${role}.`;
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_TRAINER,
        tools: [{ googleSearch: {} }]
      }
    });
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({ title: chunk.web.title, url: chunk.web.uri })) || [];
    return { text: response.text || "", sources };
  });
};

export const generateWeeklyTip = async (previousTips: WeeklyTip[], topic?: string): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const topicPrompt = topic ? ` focusing specifically on the topic: "${topic}"` : "";
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Generate Weekly Strategic Directive${topicPrompt}. STRICT RULE: DO NOT USE BOLD TEXT (NO ASTERISKS ** OR __) IN YOUR OUTPUT. TONE DOWN FONT WEIGHTS.`,
      config: { systemInstruction: SYSTEM_INSTRUCTION_WEEKLY_TIP }
    });
    return response.text || "Stay alert.";
  });
};

export const analyzeReport = async (reportText: string, reportType: string = 'SHIFT'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: `AUDIT: ${reportType}\n\n${reportText}`,
      config: { systemInstruction: SYSTEM_INSTRUCTION_AUDIT_INTELLIGENCE }
    });
    return response.text || "";
  });
};

export const fetchTopicSuggestions = async (query: string): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `6 training topic variants for: "${query}". JSON Array only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    return JSON.parse(response.text || "[]");
  });
};

export const analyzePatrolPatterns = async (reports: StoredReport[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = reports.map(r => r.content).slice(0, 5).join('\n---\n');
  const response = await ai.models.generateContent({
    model: PRIMARY_MODEL,
    contents: `Analyze patterns:\n\n${context}`
  });
  return response.text || "";
};
