
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Exclusively use process.env.API_KEY directly as per guidelines
let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn("Gemini API Key not found. AI features will be disabled.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
  }
  return aiInstance;
};

export const analyzeComplaint = async (description: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Analiza la siguiente queja médica y responde estrictamente en formato JSON: "${description}"` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, description: "Sentimiento del paciente (Muy Molesto, Neutro, Preocupado, etc.)" },
            suggestedResponse: { type: Type.STRING, description: "Respuesta institucional empática y profesional sugerida" },
            priority: { type: Type.STRING, description: "Prioridad sugerida: Baja, Media, Alta o Crítica" }
          },
          required: ["sentiment", "suggestedResponse", "priority"]
        }
      }
    });

    // Fix: Access response.text directly (it is a getter, not a method)
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Audit Error:", error);
    return {
      sentiment: "No analizado",
      suggestedResponse: "Se requiere revisión manual por el equipo de calidad.",
      priority: "Media"
    };
  }
};
