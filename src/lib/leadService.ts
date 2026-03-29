/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import type { Lead } from "./store.js";
import { v4 as uuidv4 } from 'uuid';

export async function generateDailyLeads(date: string): Promise<Lead[]> {
  const openAIKey = process.env.OPENAI_API_KEY;

  if (!openAIKey) {
    console.error("Nenhuma chave de API da OpenAI configurada.");
    throw new Error("Configure a chave de API da OpenAI para gerar leads.");
  }

  try {
    console.log("Iniciando geração de leads com OpenAI (Otimizado)...");
    const openai = new OpenAI({ apiKey: openAIKey, dangerouslyAllowBrowser: true });
    
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Você é um especialista em prospecção B2B. Sua tarefa é encontrar 10 empresas REAIS de pequeno e médio porte (SMBs) de qualquer nicho.
          
          CRITÉRIOS OBRIGATÓRIOS:
          1. Idioma/Localização: Devem ser de países que falam Português Brasileiro (pt-BR) ou Inglês (en).
          2. Dados REAIS: Você DEVE fornecer dados de contato REAIS (Instagram, WhatsApp e/ou Email). NÃO INVENTE DADOS (como contato@empresa.com ou +55 11 99999-9999). Se não souber o email ou whatsapp real, deixe em branco, mas forneça pelo menos o Instagram real ou um dos outros contatos.
          3. Presença Digital: As empresas NÃO podem ter um site próprio ou sistema público na web ativo (pois ofereceremos isso).
          4. Serviço Sugerido: Para cada lead, sugira EXATAMENTE UM dos seguintes serviços que resolve uma dor real deles:
             - Automação do Whatsapp
             - Sistema Financeiro
             - Sistema de Gerenciamento completo (CRM)
             - Aplicativo de Agendamento
             - Criação de Site
             - Aplicativo interno
          
          Retorne APENAS JSON no formato:
          {"leads": [{"name": "...", "industry": "...", "instagram": "...", "email": "...", "whatsapp": "...", "description": "...", "suggestedService": "...", "language": "pt-BR" | "en"}]}
          
          Atenção: O campo 'language' deve ser 'pt-BR' ou 'en' dependendo do idioma da empresa.`
        },
        {
          role: "user",
          content: `Gere 10 leads B2B reais (SMBs sem site) para prospecção hoje (${date}). Lembre-se: DADOS REAIS, nada de placeholders. Retorne exatamente 10.`
        }
      ],
      model: "gpt-4o",
      response_format: { type: "json_object" },
      max_tokens: 2500,
      temperature: 0.4
    });

    const content = completion.choices[0].message.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const leads = parsed.leads || [];

    return leads.map((l: any) => ({
      id: uuidv4(),
      name: l.name || "Empresa",
      industry: l.industry || "Geral",
      contact: {
        instagram: l.instagram || "",
        email: l.email || "",
        whatsapp: l.whatsapp || "",
      },
      description: `${l.description || "Lead gerado por IA"}\n\n💡 Serviço Sugerido: ${l.suggestedService || "Consultoria Digital"}`,
      generatedAt: date,
      status: 'Novo',
      language: l.language || 'pt-BR'
    }));

  } catch (error: any) {
    console.error("Erro ao gerar leads com OpenAI:", error);
    throw error;
  }
}

