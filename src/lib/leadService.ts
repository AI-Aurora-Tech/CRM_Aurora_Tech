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
          content: `Você é um gerador de dados de demonstração. Sua tarefa é CRIAR 10 exemplos de leads B2B para preencher um sistema de demonstração.
          
          CRITÉRIOS:
          1. Localização: Misture empresas fictícias do Brasil e de países de língua inglesa.
          2. Dados de Contato: Use dados GENÉRICOS DE DEMONSTRAÇÃO. 
             - WhatsApp: +55 11 99999-0001, +1 555-0101, etc.
             - E-mail: contato@empresaexemplo.com.br, info@examplebusiness.com
             - Instagram: @empresa_exemplo_demo
          3. Google Maps: Crie um link de busca genérico (ex: https://www.google.com/maps/search/?api=1&query=Empresa+Exemplo).
          4. Serviço Sugerido: Sugira um serviço de tecnologia (ex: App de agendamento, Sistema de Gerenciamento, Criação de Site).
          
          Retorne APENAS JSON no formato:
          {"leads": [{"name": "...", "industry": "...", "instagram": "...", "email": "...", "whatsapp": "...", "googleMapsLink": "...", "description": "...", "suggestedService": "...", "language": "pt-BR" | "en"}]}
          
          Atenção: O campo 'language' deve refletir o idioma do país da empresa.`
        },
        {
          role: "user",
          content: `Gere 10 leads B2B de demonstração (Brasil e países de língua inglesa) para a data ${date}. 
          Requisitos: 
          - Simule SMBs sem site/app.
          - Preencha WhatsApp, E-mail e Instagram com dados genéricos de teste.
          - Inclua link de busca do Google Maps.
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

