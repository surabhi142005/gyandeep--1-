import { GoogleGenAI, Type } from "@google/genai";
import type { QuizQuestion, Coordinates } from '../types';

export interface ChatbotResponse {
  text: string;
  sources: Array<{ uri: string, title: string }>;
}

export interface QuizGenerationOptions {
  notesText: string;
  subject: string;
  enableThinkingMode: boolean;
}

export const generateQuizFromNotes = async ({ notesText, subject, enableThinkingMode }: QuizGenerationOptions): Promise<QuizQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const modelName = enableThinkingMode ? "gemini-2.5-pro" : "gemini-2.5-flash";
    const config: any = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quiz: {
              type: Type.ARRAY,
              description: "An array of 5 quiz questions.",
              items: {
                type: Type.OBJECT,
                properties: {
                  question: {
                    type: Type.STRING,
                    description: "The question text."
                  },
                  options: {
                    type: Type.ARRAY,
                    description: "An array of 4 possible answers.",
                    items: { type: Type.STRING }
                  },
                  correctAnswer: {
                    type: Type.STRING,
                    description: "The correct answer, which must be one of the provided options."
                  }
                },
                required: ["question", "options", "correctAnswer"]
              }
            }
          },
          required: ["quiz"]
        }
    };
    
    if (enableThinkingMode) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Based on the following class notes for the subject "${subject}", generate exactly 5 multiple-choice quiz questions. Each question must have 4 options and a single correct answer. Ensure the correct answer is one of the options.
      
      Class Notes:
      ---
      ${notesText}
      ---
      `,
      config: config
    });

    const jsonResponse = JSON.parse(response.text);
    if (!jsonResponse.quiz || jsonResponse.quiz.length === 0) {
      throw new Error("AI failed to generate a valid quiz.");
    }
    
    return jsonResponse.quiz.map((q: Omit<QuizQuestion, 'id'>, index: number) => ({
      ...q,
      id: `q-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("Error generating quiz:", error);
    if (error instanceof Error) {
        if (error.message.includes("SAFETY")) {
            throw new Error("Could not generate quiz: The provided notes may contain inappropriate content.");
        }
        if (error.message.includes("400")) {
            throw new Error("Could not generate quiz: The request was malformed. Please check the notes content and try again.");
        }
        throw new Error(`AI service error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the quiz.");
  }
};

export interface ChatbotRequest {
    prompt: string;
    location: Coordinates | null;
    model: 'fast' | 'smart';
}

export const getChatbotResponse = async ({ prompt, location, model }: ChatbotRequest): Promise<ChatbotResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const modelName = model === 'fast' ? 'gemini-flash-lite-latest' : 'gemini-2.5-flash';
    
    const config: any = {
      tools: [{googleMaps: {}}],
    };

    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: location.lat,
            longitude: location.lng
          }
        }
      };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: config,
    });

    const text = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = groundingChunks
      .filter((chunk: any) => chunk.maps)
      .flatMap((chunk: any) => {
        const foundSources = [];
        if (chunk.maps.uri && chunk.maps.title) {
            foundSources.push({ uri: chunk.maps.uri, title: chunk.maps.title });
        }
        if (chunk.maps.placeAnswerSources?.reviewSnippets) {
            for (const snippet of chunk.maps.placeAnswerSources.reviewSnippets) {
                if (snippet.uri && snippet.title) {
                    foundSources.push({ uri: snippet.uri, title: snippet.title });
                }
            }
        }
        return foundSources;
      })
      .filter((source: any, index: number, self: any[]) => 
          index === self.findIndex((s: any) => s.uri === source.uri)
      );

    return { text, sources };

  } catch (error) {
    console.error("Error getting chatbot response:", error);
    if (error instanceof Error) {
        if (error.message.includes("SAFETY")) {
            throw new Error("The response was blocked due to safety concerns. Please try a different prompt.");
        }
        if (error.message.includes("400")) {
             throw new Error("The request was invalid. Please rephrase your question and try again.");
        }
        throw new Error(`AI assistant error: ${error.message}`);
    }
    throw new Error("Failed to get response from AI assistant due to an unknown error.");
  }
};