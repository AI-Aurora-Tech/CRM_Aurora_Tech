/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import type { Lead } from "./store.js";
import { v4 as uuidv4 } from 'uuid';

export async function generateDailyLeads(date: string): Promise<Lead[]> {
  const openAIKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // Tentar OpenAI primeiro se a chave existir
  if (openAIKey) {
    try {
      console.log("Iniciando geração de leads com OpenAI...");
      const openai = new OpenAI({ apiKey: openAIKey, dangerouslyAllowBrowser: true });
      
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Você é um assistente especializado em gerar leads B2B qualificados no Brasil. Retorne APENAS um JSON válido contendo um objeto com a propriedade 'leads'."
          },
          {
            role: "user",
            content: `Gere uma lista com 10 exemplos de leads B2B no Brasil para o dia ${date}.
            1. Podem ser empresas reais ou exemplos altamente realistas de negócios locais.
            2. Foco: Escolas, clínicas de estética, oficinas, padarias e negócios de atendimento local.
            3. É OBRIGATÓRIO retornar exatamente 10 empresas.
            4. CONTATOS: Gere contatos de exemplo (Instagram, E-mail, WhatsApp) que pareçam reais, ou deixe vazio se preferir.
            5. Retorne um JSON com a seguinte estrutura exata:
            {
              "leads": [
                {
                  "name": "Nome da Empresa",
                  "industry": "Ramo de Atividade",
                  "instagram": "@instagram_exemplo",
                  "email": "email@exemplo.com",
                  "whatsapp": "11999999999",
                  "description": "Por que é um bom lead"
                }
              ]
            }
            IMPORTANTE: Você DEVE retornar 10 empresas na lista.`
          }
        ],
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      console.log("Resposta da OpenAI recebida:", content);
      
      if (!content) {
        console.warn("OpenAI retornou conteúdo vazio.");
        return [];
      }

      const parsed = JSON.parse(content);
      const leads = Array.isArray(parsed) ? parsed : (parsed.leads || parsed.companies || parsed.empresas || []);

      if (!leads || leads.length === 0) {
        console.warn("Nenhum lead encontrado no JSON parseado:", parsed);
        throw new Error("A IA não retornou leads no formato esperado. Tentando novamente...");
      }

      return leads.map((l: any) => ({
        id: uuidv4(),
        name: l.name || "Empresa Sem Nome",
        industry: l.industry || "Geral",
        contact: {
          instagram: l.instagram || l.contact?.instagram,
          email: l.email || l.contact?.email,
          whatsapp: l.whatsapp || l.contact?.whatsapp,
        },
        description: l.description || "Lead gerado por IA",
        generatedAt: date,
      }));

    } catch (error: any) {
      console.error("Erro ao gerar leads com OpenAI:", error);
      
      if (geminiKey) {
        console.warn(`Erro OpenAI (${error.status || error.code || error.message}). Tentando fallback para Gemini...`);
        // Continua para a lógica do Gemini abaixo
      } else {
        throw error; // Se não tiver chave Gemini, lança o erro original
      }
    }
  }

  // Lógica do Gemini (Fallback ou Principal)
  if (!geminiKey) {
    console.error("Nenhuma chave de API (OpenAI ou Gemini) configurada ou válida.");
    throw new Error("Configure uma chave de API (OpenAI ou Gemini) para gerar leads.");
  }

  try {
    console.log("Iniciando geração de leads com Gemini...");
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere uma lista com 10 exemplos de leads B2B no Brasil para o dia ${date}.
      1. Podem ser empresas reais ou exemplos altamente realistas de negócios locais.
      2. Foco: Escolas, clínicas de estética, oficinas, padarias e negócios de atendimento local.
      3. É OBRIGATÓRIO retornar exatamente 10 empresas.
      4. CONTATOS: Gere contatos de exemplo (Instagram, E-mail, WhatsApp) que pareçam reais, ou deixe vazio se preferir.
      5. Retorne APENAS um JSON válido contendo um array de objetos.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nome real da empresa" },
              industry: { type: Type.STRING, description: "Ramo de atividade" },
              instagram: { type: Type.STRING, description: "Link ou handle do Instagram real (ou vazio se não souber)" },
              email: { type: Type.STRING, description: "E-mail de contato real (ou vazio se não souber)" },
              whatsapp: { type: Type.STRING, description: "Número de WhatsApp real com DDI 55 (ou vazio se não souber)" },
              description: { type: Type.STRING, description: "Breve descrição do porquê é um bom lead" },
            },
            required: ["name", "industry", "description"],
          },
        },
      },
    });

    const rawJson = response.text;
    console.log("Resposta do Gemini recebida:", rawJson);
    
    if (!rawJson) {
      console.warn("Gemini retornou conteúdo vazio.");
      return [];
    }

    const parsedLeads = JSON.parse(rawJson);
    
    return parsedLeads.map((l: any) => ({
      id: uuidv4(),
      name: l.name || "Empresa Sem Nome",
      industry: l.industry || "Geral",
      contact: {
        instagram: l.instagram || l.contact?.instagram,
        email: l.email || l.contact?.email,
        whatsapp: l.whatsapp || l.contact?.whatsapp,
      },
      description: l.description || "Lead gerado por IA",
      generatedAt: date,
    }));
  } catch (error: any) {
    if (error.message?.includes("429") || error.status === "RESOURCE_EXHAUSTED" || error.message?.includes("quota")) {
      throw new Error("Limite de cota atingido em ambos os provedores (OpenAI e Gemini). Tente novamente mais tarde.");
    }
    console.error("Erro ao gerar leads com Gemini:", error);
    throw error;
  }
}
