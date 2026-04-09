import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const SYSTEM_PROMPT = `You are AgriBridge AI, an expert agricultural assistant for smallholder farmers in West Africa.
Your goal is to provide simple, actionable, and localized advice to help farmers improve their yields and protect their crops.

CONSTRAINTS:
- Tone: Non-technical, farmer-friendly, empathetic, and encouraging.
- Language: Use simple English (primary school level). Avoid scientific jargon.
- Solutions: Focus on low-cost, locally available solutions (e.g., neem oil, wood ash, crop rotation, organic manure).
- Context: West African climate, crops (maize, rice, cassava, yam, cocoa), and common pests/diseases.

CORE CAPABILITIES:
1. Diagnose crop diseases from symptoms.
2. Provide planting advice based on location and season.
3. Offer pest control and fertilizer recommendations.
4. Translate advice into local languages (Pidgin, Yoruba, Hausa, Igbo, French).

When translating:
- Keep it natural and conversational.
- Use common terms farmers use.
`;

export interface DiagnosisResult {
  disease: string;
  cause: string;
  treatment: string;
  prevention: string;
}

export interface PlantingAdvice {
  bestTime: string;
  climateAdvice: string;
  risks: string[];
}

export async function getChatResponse(message: string, language: string = "English") {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\n\nIMPORTANT: Provide the response in ${language}. If the language is not English, provide a short English summary first, then the full translation.`,
      },
    });
    return response.text || "I'm sorry, I couldn't process that. Please try again.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting right now. Please check your internet or try again later.";
  }
}

export async function diagnoseCrop(crop: string, symptoms: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Crop: ${crop}\nSymptoms: ${symptoms}`,
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\n\nDiagnose the crop disease and provide structured JSON output.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            disease: { type: Type.STRING, description: "Likely disease or pest name" },
            cause: { type: Type.STRING, description: "Simple explanation of the cause" },
            treatment: { type: Type.STRING, description: "Low-cost, local treatment" },
            prevention: { type: Type.STRING, description: "How to prevent it in the future" },
          },
          required: ["disease", "cause", "treatment", "prevention"],
        },
      },
    });
    return JSON.parse(response.text || "{}") as DiagnosisResult;
  } catch (error) {
    console.error("Diagnosis Error:", error);
    throw error;
  }
}

export async function getPlantingAdvice(location: string, crop: string, month: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Location: ${location}\nCrop: ${crop}\nMonth: ${month}`,
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\n\nProvide planting advice and structured JSON output.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bestTime: { type: Type.STRING, description: "When to plant" },
            climateAdvice: { type: Type.STRING, description: "Advice regarding weather/climate" },
            risks: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Potential risks to watch out for"
            },
          },
          required: ["bestTime", "climateAdvice", "risks"],
        },
      },
    });
    return JSON.parse(response.text || "{}") as PlantingAdvice;
  } catch (error) {
    console.error("Planting Advice Error:", error);
    throw error;
  }
}
