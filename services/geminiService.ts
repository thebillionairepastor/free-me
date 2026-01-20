import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION_ADVISOR, SYSTEM_INSTRUCTION_TRAINER, SYSTEM_INSTRUCTION_WEEKLY_TIP, SYSTEM_INSTRUCTION_NEWS } from "../constants";
import { ChatMessage, StoredReport, KnowledgeDocument, WeeklyTip, NewsItem } from "../types";

/**
 * Helper to initialize the AI client with the injected API Key.
 * Re-initializing per call ensures we always use the latest state.
 */
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("SEC-VAULT-403: API_KEY is missing from the production bundle. Check Netlify Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Real-time Security News Blog Service (CEO Focused)
 */
export const fetchSecurityNews = async (): Promise<NewsItem[]> => {
  const ai = getAIClient();
  try {
    const prompt = `Generate the Latest CEO Security News Blog for today.
    Instructions:
    1. Search for verified updates from Nigeria Civil Defence (NSCDC), NIMASA, ISO, and global security news.
    2. Focus on physical security manpower supply business impact.
    3. Return precisely 10 items in JSON format.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_NEWS,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              headline: { type: Type.STRING },
              category: { type: Type.STRING, enum: ['Operational', 'Policy', 'Certification', 'Training', 'Trend', 'Risk'] },
              source: { type: Type.STRING },
              summary: { type: Type.STRING },
              date: { type: Type.STRING },
              link: { type: Type.STRING }
            },
            required: ['id', 'headline', 'category', 'source', 'summary', 'date', 'link']
          }
        }
      }
    });

    const items: NewsItem[] = JSON.parse(response.text || "[]");
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return items.map(item => ({ ...item, sources }));
  } catch (error) {
    console.error("News Intelligence Error:", error);
    throw error;
  }
};

/**
 * Deep Intelligence Search: Accesses the "10 Million Topic Bank"
 */
export const fetchTopicSuggestions = async (query: string): Promise<string[]> => {
  const ai = getAIClient();
  try {
    const prompt = `Act as the "Master Neural Index" for the AntiRisk Global 10-Million Security Training Data Bank.
    Search query: "${query}"
    
    TASK: Provide 10 highly specific, non-repeating "vibrations" (variations) of this topic.
    Return ONLY a JSON array of strings.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Deep Vault Search Error:", error);
    throw error;
  }
};

/**
 * Training Module Generator
 */
export const generateTrainingModule = async (topic: string, week: number = 1, role: string = "All Roles"): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  const ai = getAIClient();
  try {
    const prompt = `COMMAND: Generate a globally unique "vibration" of the training objective: "${topic}".
    PROGRESSION: Week ${week}
    ROLE FOCUS: ${role}
    
    Ensure the module ends with the signature: 
    "From: Antirisk Expert Security Advisor"
    "Signed - CEO/MD"`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_TRAINER,
        tools: [{ googleSearch: {} }],
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return { 
      text: response.text || "Failed to generate training content.",
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Training Gen Error:", error);
    throw error;
  }
};

export const generateWeeklyTip = async (previousTips: WeeklyTip[]): Promise<string> => {
  const ai = getAIClient();
  try {
    const prompt = `Generate a new "Weekly Strategic Focus" tip.
    MANDATORY: End with the signature:
    "From: Antirisk Expert Security Advisor"
    "Signed - CEO/MD"`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION_WEEKLY_TIP }
    });
    return response.text || "Maintain maximum vigilance at all access points.\n\nFrom: Antirisk Expert Security Advisor\nSigned - CEO/MD";
  } catch (error) {
    console.error("Weekly Tip Error:", error);
    throw error;
  }
};

export const generateAdvisorResponse = async (
  history: ChatMessage[], 
  currentMessage: string,
  knowledgeBase: KnowledgeDocument[] = []
): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  const ai = getAIClient();
  try {
    const conversationContext = history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `PREVIOUS HISTORY:\n${conversationContext}\n\nUSER: ${currentMessage}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_ADVISOR,
        tools: [{ googleSearch: {} }]
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return { 
      text: response.text || "I couldn't generate a response.",
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Advisor Error:", error);
    throw error;
  }
};

export const fetchBestPractices = async (topic?: string): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  const ai = getAIClient();
  try {
    const finalTopic = topic && topic.trim() !== "" 
      ? topic 
      : "latest physical security industrial best practices, ISO standards updates, and NSCDC/NIMASA regulatory shifts for 2025/2026.";

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Perform a deep search on: "${finalTopic}". Focus on strategic business positioning and market risks.`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return { 
      text: response.text || "No current intelligence found.",
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Best Practices Error:", error);
    throw error;
  }
};

export const getTrainingSuggestions = async (recentReports: StoredReport[]): Promise<string[]> => {
  const ai = getAIClient();
  try {
    const context = recentReports.map(r => `- ${r.content}`).join('\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on these incidents, suggest 3 highly specific training "vibrations" focusing on prevention:\n${context}\nReturn strings separated by |||`,
    });
    return (response.text || "").split('|||').map(t => t.trim());
  } catch (error) {
    console.error("Suggestions Error:", error);
    throw error;
  }
};

export const analyzeReport = async (reportText: string, previousReports: StoredReport[] = []): Promise<string> => {
  const ai = getAIClient();
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze this dispatch log for industrial security vulnerabilities: ${reportText}`,
    });
    return response.text || "Analysis complete.";
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};