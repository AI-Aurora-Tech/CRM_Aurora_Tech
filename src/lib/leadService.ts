import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "./store";
import { v4 as uuidv4 } from 'uuid';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateDailyLeads(date: string): Promise<Lead[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere uma lista de 10 empresas brasileiras (leads) para o dia ${date} que atendam aos seguintes critérios:
      1. Tenham Instagram e/ou e-mail registrado publicamente.
      2. NÃO tenham site próprio ou aplicativo duplicado.
      3. Sejam empresas de pequeno a médio porte.
      4. Prioridade: Escolas (para venda de CRM), clínicas de estética e negócios de atendimento que precisam automatizar processos.
      5. Localização: Brasil.
      6. Retorne APENAS um JSON válido seguindo o esquema solicitado.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nome da empresa" },
              industry: { type: Type.STRING, description: "Ramo de atividade" },
              instagram: { type: Type.STRING, description: "Link ou handle do Instagram" },
              email: { type: Type.STRING, description: "E-mail de contato" },
              description: { type: Type.STRING, description: "Breve descrição do porquê é um bom lead" },
            },
            required: ["name", "industry", "description"],
          },
        },
        tools: [{ googleSearch: {} }],
      },
    });

    const rawJson = response.text;
    if (!rawJson) return [];

    const parsedLeads = JSON.parse(rawJson);
    
    return parsedLeads.map((l: any) => ({
      id: uuidv4(),
      name: l.name,
      industry: l.industry,
      contact: {
        instagram: l.instagram,
        email: l.email,
      },
      description: l.description,
      generatedAt: date,
    }));
  } catch (error) {
    console.error("Erro ao gerar leads:", error);
    return [];
  }
}
