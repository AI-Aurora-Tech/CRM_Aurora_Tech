/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { Lead } from "./store";
import { v4 as uuidv4 } from 'uuid';

export async function generateDailyLeads(date: string): Promise<Lead[]> {
  const getEnv = (key: string) => {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${key}`]) {
      return import.meta.env[`VITE_${key}`];
    }
    return undefined;
  };

  const openAIKey = getEnv('OPENAI_API_KEY');
  const geminiKey = getEnv('GEMINI_API_KEY');

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
            content: `Gere uma lista de 10 empresas brasileiras REAIS (leads) para o dia ${date} que atendam aos seguintes critérios:
            1. Sejam empresas reais e ativas.
            2. NÃO tenham site próprio ou aplicativo duplicado.
            3. Sejam empresas de pequeno a médio porte.
            4. Prioridade: Escolas (para venda de CRM), clínicas de estética e negócios de atendimento que precisam automatizar processos.
            5. Localização: Brasil.
            6. CONTATOS REAIS (MUITO IMPORTANTE): Você é ESTRITAMENTE PROIBIDO de inventar, adivinhar ou gerar números de WhatsApp falsos (como 11999999999 ou 1188888888) ou e-mails genéricos falsos (como contato@nomedaempresa.com). Se você não souber o WhatsApp ou E-mail REAL e VERDADEIRO da empresa, retorne null ou uma string vazia "".
            7. Retorne um JSON com a seguinte estrutura exata:
            {
              "leads": [
                {
                  "name": "Nome Real da Empresa",
                  "industry": "Ramo de Atividade",
                  "instagram": "@instagram_real_se_existir",
                  "email": "email_real_se_existir_ou_vazio",
                  "whatsapp": "whatsapp_real_se_existir_ou_vazio",
                  "description": "Por que é um bom lead"
                }
              ]
            }
            IMPORTANTE: Apenas forneça dados de contato se tiver certeza absoluta de que são reais.`
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
      
      // Se for erro de cota (429) ou erro de modelo, tentar fallback para Gemini
      const isQuotaError = error.status === 429 || error.code === 'insufficient_quota' || error.message?.includes('quota');
      const isModelError = error.status === 404 || error.code === 'model_not_found';
      
      if ((isQuotaError || isModelError || error.message?.includes("formato esperado")) && geminiKey) {
        console.warn(`Erro OpenAI (${error.status || error.code || error.message}). Tentando fallback para Gemini...`);
        // Continua para a lógica do Gemini abaixo
      } else {
        throw error; // Se não tiver chave Gemini ou for outro erro, lança o erro original
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
      contents: `Gere uma lista de 10 empresas brasileiras REAIS (leads) para o dia ${date} que atendam aos seguintes critérios:
      1. Sejam empresas reais e ativas.
      2. NÃO tenham site próprio ou aplicativo duplicado.
      3. Sejam empresas de pequeno a médio porte.
      4. Prioridade: Escolas (para venda de CRM), clínicas de estética e negócios de atendimento que precisam automatizar processos.
      5. Localização: Brasil.
      6. CONTATOS REAIS (MUITO IMPORTANTE): Você é ESTRITAMENTE PROIBIDO de inventar, adivinhar ou gerar números de WhatsApp falsos (como 11999999999) ou e-mails genéricos falsos (como contato@empresa.com). Se você não souber o WhatsApp ou E-mail REAL e VERDADEIRO da empresa, deixe o campo vazio.
      7. Retorne APENAS um JSON válido contendo um array de objetos.`,
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
