
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION_ADVISOR, SYSTEM_INSTRUCTION_TRAINER, SYSTEM_INSTRUCTION_WEEKLY_TIP, SYSTEM_INSTRUCTION_NEWS } from "../constants";
import { ChatMessage, StoredReport, KnowledgeDocument, WeeklyTip, NewsItem } from "../types";

/**
 * Real-time Security News Blog Service
 */
export const fetchSecurityNews = async (): Promise<NewsItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `Generate the Latest CEO Security News Blog for Today. 
    Focus on Nigeria Civil Defence (NSCDC) licensing, NIMASA maritime security updates, ISO 18788/ISO 27001 industrial standards, and professional certifications like CPP/CPO.
    Ensure exactly 10 high-quality, verified items.
    Use the Google Search tool to find real current dates and events.`;

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

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("News Fetch Error:", error);
    throw error;
  }
};

/**
 * Deep Intelligence Search: Accesses the "10 Million Topic Bank"
 */
export const fetchTopicSuggestions = async (query: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `Act as the Master Index for the "AntiRisk Global 10-Million Security Training Data Bank".
    Search query: "${query}"
    Provide 8 specific, professional training module titles focusing on granular details like vehicle seat voids, waybill stamp analysis, or fence weak-points.
    Ensure titles are globally unique and haven't been used.
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
    console.error("Deep Search Error:", error);
    throw error;
  }
};

/**
 * Training Module Generator
 */
export const generateTrainingModule = async (topic: string, week: number = 1, role: string = "All Roles"): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // Inject massive variation factors
    const environments = ["Industrial Warehouse", "Offshore Oil Rig", "Manufacturing Plant", "Commercial Loading Dock", "Maritime Port Terminal", "Construction Site"];
    const weather = ["Heavy Rain", "Intense Heat", "Nightfall", "Early Dawn", "Dusty/Harmattan", "Clear Visibility"];
    const riskLevel = ["Normal Operations", "High Holiday Alert", "Shift Change Rush", "Weekend Reduced Staffing"];
    
    const randomEnv = environments[Math.floor(Math.random() * environments.length)];
    const randomWeather = weather[Math.floor(Math.random() * weather.length)];
    const randomRisk = riskLevel[Math.floor(Math.random() * riskLevel.length)];

    const prompt = `COMMAND: Generate a globally unique Training Module.
    TOPIC: "${topic}"
    PROGRESSION: Week ${week}
    ROLE FOCUS: ${role}
    FACILITY TYPE: ${randomEnv}
    WEATHER/TIME: ${randomWeather}
    RISK CONTEXT: ${randomRisk}

    INSTRUCTION: Adhere strictly to the "STRICT OUTPUT FORMAT". Ensure content is world-class industrial standard but simple for guards.`;

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

// Weekly Tip
export const generateWeeklyTip = async (previousTips: WeeklyTip[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // Force variation by picking a random focus area
    const areas = ["Vehicle Search (Entry)", "Vehicle Search (Exit)", "Waybill Forgery", "Staff Bag Searches", "Fence Integrity", "Asset Theft Prevention"];
    const randomFocus = areas[Math.floor(Math.random() * areas.length)];
    
    const prompt = `Generate a new, globally unique "Weekly Strategic Focus" tip focusing on: ${randomFocus}. Use industrial standards. Avoid repeating any common phrasing.`;
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION_WEEKLY_TIP }
    });
    return response.text || "Maintain maximum vigilance at all access points.";
  } catch (error) {
    console.error("Weekly Tip Error:", error);
    throw error;
  }
};

// Advisor Chat
export const generateAdvisorResponse = async (
  history: ChatMessage[], 
  currentMessage: string,
  knowledgeBase: KnowledgeDocument[] = []
): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const kbContext = knowledgeBase.length > 0 
      ? `INTERNAL KNOWLEDGE BASE:
         ${knowledgeBase.map(doc => `--- DOCUMENT: ${doc.title} ---\n${doc.content}`).join('\n\n')}`
      : "NO INTERNAL KNOWLEDGE BASE.";

    const conversationContext = history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');
    const fullPrompt = `${kbContext}\n\nPREVIOUS HISTORY:\n${conversationContext}\n\nUSER: ${currentMessage}`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_ADVISOR,
      }
    });

    return { text: response.text || "I couldn't generate a response." };
  } catch (error) {
    console.error("Advisor Error:", error);
    throw error;
  }
};

// Best Practices / Global Trends
export const fetchBestPractices = async (topic?: string): Promise<{ text: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const finalTopic = topic && topic.trim() !== "" 
      ? topic 
      : "high-priority industrial security best practice for 2025.";

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Intelligence brief on: "${finalTopic}". Focus on new theft trends and tactical countermeasures. CEO level briefing.`,
      config: { tools: [{ googleSearch: {} }] },
    });

    return { text: response.text || "No intelligence found." };
  } catch (error) {
    console.error("Best Practices Error:", error);
    throw error;
  }
};

// Training suggestions based on incident history
export const getTrainingSuggestions = async (recentReports: StoredReport[]): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const context = recentReports.map(r => `- ${r.content}`).join('\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on these industrial site incidents, suggest 3 highly specific training topics focusing on Waybills, Vehicle Checks, or Perimeter Integrity:\n${context}\nReturn strings separated by |||`,
    });
    return (response.text || "").split('|||').map(t => t.trim());
  } catch (error) {
    console.error("Suggestions Error:", error);
    throw error;
  }
};

// Report Analysis
export const analyzeReport = async (reportText: string, previousReports: StoredReport[] = []): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze this dispatch log for industrial security vulnerabilities, internal theft patterns, or document manipulation: ${reportText}`,
    });
    return response.text || "Analysis complete.";
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

// Patrol Optimization
export const analyzePatrolEffectiveness = async (reports: StoredReport[], knowledgeBase: KnowledgeDocument[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: "Evaluate patrol effectiveness based on site incidents and suggest randomization strategies to prevent 'watching the watcher' behavior. Focus on blind spots and theft-prone windows.",
    });
    return response.text || "Strategy pending.";
  } catch (error) {
    console.error("Patrol Analysis Error:", error);
    throw error;
  }
};
