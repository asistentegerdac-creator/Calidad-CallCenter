import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeComplaint = async (description: string) => {
  try {
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