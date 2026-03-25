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
          content: `Você é um assistente B2B especializado em prospecção. Gere 10 leads qualificados no Brasil. 
          Para cada lead, você deve sugerir EXATAMENTE UM dos seguintes serviços que melhor se encaixa com o negócio e a dor provável:
          - Automação do Whatsapp
          - Sistema Financeiro
          - Sistema de Gerenciamento completo (CRM)
          - Aplicativo de Agendamento
          - Criação de Site
          - Aplicativo interno
          
          Retorne APENAS JSON: {"leads": [{"name": "...", "industry": "...", "instagram": "...", "email": "...", "whatsapp": "...", "description": "...", "suggestedService": "..."}]}`
        },
        {
          role: "user",
          content: `Gere 10 leads B2B no Brasil para ${date}. Foco: Escolas, clínicas, oficinas, padarias. Retorne exatamente 10.`
        }
      ],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.7
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
      status: 'Novo'
    }));

  } catch (error: any) {
    console.error("Erro ao gerar leads com OpenAI:", error);
    throw error;
  }
}

