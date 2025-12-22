import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeComplaint = async (description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza esta queja médica: "${description}". Determina sentimiento y sugiere una respuesta profesional.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING },
            suggestedResponse: { type: Type.STRING },
            priority: { type: Type.STRING, description: "Baja, Media, Alta o Crítica" }
          },
          required: ["sentiment", "suggestedResponse", "priority"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};