
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini API following specific library guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeComplaint = async (description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza la siguiente queja de un paciente y sugiere una respuesta profesional y acciones de mejora: "${description}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, description: "Sentimiento: Positivo, Neutro, Negativo" },
            suggestedResponse: { type: Type.STRING, description: "Respuesta sugerida para el paciente" },
            actionPlan: { type: Type.STRING, description: "Plan de acción interno" }
          },
          required: ["sentiment", "suggestedResponse", "actionPlan"]
        }
      }
    });
    
    // Access the .text property directly as a string (not a function)
    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};
