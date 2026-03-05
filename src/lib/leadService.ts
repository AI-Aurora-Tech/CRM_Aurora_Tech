import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { Lead } from "./store";
import { v4 as uuidv4 } from 'uuid';

export async function generateDailyLeads(date: string): Promise<Lead[]> {
  const openAIKey = import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (openAIKey) {
    try {
      const openai = new OpenAI({ apiKey: openAIKey, dangerouslyAllowBrowser: true }); // Allow browser usage since this is client-side code in preview
      
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Você é um assistente especializado em gerar leads B2B qualificados no Brasil. Retorne APENAS um JSON válido."
          },
          {
            role: "user",
            content: `Gere uma lista de 10 empresas brasileiras (leads) para o dia ${date} que atendam aos seguintes critérios:
            1. Tenham Instagram e/ou e-mail registrado publicamente.
            2. NÃO tenham site próprio ou aplicativo duplicado.
            3. Sejam empresas de pequeno a médio porte.
            4. Prioridade: Escolas (para venda de CRM), clínicas de estética e negócios de atendimento que precisam automatizar processos.
            5. Localização: Brasil.
            6. Retorne um JSON com a seguinte estrutura:
            [
              {
                "name": "Nome da Empresa",
                "industry": "Ramo de Atividade",
                "instagram": "@instagram",
                "email": "email@exemplo.com",
                "description": "Por que é um bom lead"
              }
            ]`
          }
        ],
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      const leads = Array.isArray(parsed) ? parsed : (parsed.leads || parsed.companies || []);

      return leads.map((l: any) => ({
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

    } catch (error: any) {
      console.error("Erro ao gerar leads com OpenAI:", error);
      
      // Se o erro for 404 (modelo não encontrado) ou 400 (bad request), tentar com gpt-3.5-turbo
      if (error.status === 404 || error.status === 400 || error.code === 'model_not_found') {
        console.log("Tentando fallback para gpt-3.5-turbo...");
        try {
          const openai = new OpenAI({ apiKey: openAIKey, dangerouslyAllowBrowser: true });
          const completion = await openai.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "Você é um assistente especializado em gerar leads B2B qualificados no Brasil. Retorne APENAS um JSON válido."
              },
              {
                role: "user",
                content: `Gere uma lista de 10 empresas brasileiras (leads) para o dia ${date} que atendam aos seguintes critérios:
                1. Tenham Instagram e/ou e-mail registrado publicamente.
                2. NÃO tenham site próprio ou aplicativo duplicado.
                3. Sejam empresas de pequeno a médio porte.
                4. Prioridade: Escolas (para venda de CRM), clínicas de estética e negócios de atendimento que precisam automatizar processos.
                5. Localização: Brasil.
                6. Retorne um JSON com a seguinte estrutura:
                [
                  {
                    "name": "Nome da Empresa",
                    "industry": "Ramo de Atividade",
                    "instagram": "@instagram",
                    "email": "email@exemplo.com",
                    "description": "Por que é um bom lead"
                  }
                ]`
              }
            ],
            model: "gpt-3.5-turbo",
            // gpt-3.5-turbo doesn't support response_format: { type: "json_object" } in older versions, but newer ones do.
            // To be safe, let's remove it for fallback or ensure we parse correctly.
          });

          const content = completion.choices[0].message.content;
          if (!content) throw new Error("Sem conteúdo no fallback");

          const parsed = JSON.parse(content);
          const leads = Array.isArray(parsed) ? parsed : (parsed.leads || parsed.companies || []);

          return leads.map((l: any) => ({
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
        } catch (fallbackError) {
          console.error("Erro no fallback OpenAI:", fallbackError);
          throw error; // Throw original error to show to user
        }
      }
      
      throw error; // Don't fallback to Gemini if OpenAI key is present
    }
  }

  if (!geminiKey) {
    console.error("Nenhuma chave de API (OpenAI ou Gemini) configurada.");
    return [];
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
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
  } catch (error: any) {
    if (error.message?.includes("429") || error.status === "RESOURCE_EXHAUSTED" || error.message?.includes("quota")) {
      throw new Error("Limite de cota do Gemini atingido. Configure sua chave da OpenAI no .env para evitar isso.");
    }
    console.error("Erro ao gerar leads:", error);
    throw error;
  }
}
