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
          content: `Você é um pesquisador de mercado. Sua tarefa é buscar na sua memória de treinamento 10 empresas REAIS (SMBs) do Brasil.
          
          CRITÉRIOS OBRIGATÓRIOS:
          1. Empresas REAIS: Você DEVE fornecer empresas que realmente existem no Brasil. Use nomes reais e cidades reais.
          2. Contatos REAIS: 
             - Instagram: Forneça o @ real da empresa se você souber. Se não souber, deixe em branco ("").
             - WhatsApp/Email: Se você não souber o número ou email real e público, deixe em branco (""). 
             - REGRA DE OURO: NÃO INVENTE NÚMEROS DE TELEFONE (como +551199999999) OU EMAILS FALSOS. É melhor deixar em branco do que inventar.
          3. Sem Site: Priorize empresas que, até onde você sabe, não possuem site próprio.
          4. Google Maps: Crie um link de busca do Google Maps com o nome real da empresa e a cidade.
          5. Descarte: Se você não souber NENHUM contato real (nem Insta, nem email, nem whats) de uma empresa, NÃO a inclua na lista. Busque outra.
          
          Retorne APENAS JSON no formato:
          {"leads": [{"name": "...", "industry": "...", "instagram": "...", "email": "...", "whatsapp": "...", "googleMapsLink": "...", "description": "...", "suggestedService": "...", "language": "pt-BR"}]}
          `
        },
        {
          role: "user",
          content: `Busque na sua base de dados 10 leads B2B REAIS do Brasil para prospecção em ${date}. 
          Requisitos: 
          - Empresas que realmente existem.
          - Contatos (Insta, Whats, Email) DEVEM ser reais. Se não souber o real, deixe a string vazia "". NÃO INVENTE.
          - Devem ter pelo menos UM contato preenchido.
          - Sugira um serviço de tecnologia específico.
          Retorne exatamente 10 leads no formato JSON.`
        }
      ],
      model: "gpt-4o",
      response_format: { type: "json_object" },
      max_tokens: 3000,
      temperature: 0.5
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
        googleMapsLink: l.googleMapsLink || "",
      },
      description: `${l.description || "Lead gerado por IA"}\n\n💡 Serviço Sugerido: ${l.suggestedService || "Criação de Site"}`,
      generatedAt: date,
      status: 'Novo',
      language: l.language || 'pt-BR'
    }));

  } catch (error: any) {
    console.error("Erro ao gerar leads com OpenAI:", error);
    throw error;
  }
}

