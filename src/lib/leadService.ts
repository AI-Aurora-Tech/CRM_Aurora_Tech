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
          content: `Você é um especialista em prospecção B2B e pesquisa de mercado. Sua tarefa é encontrar 10 empresas REAIS de pequeno e médio porte (SMBs) no Brasil.
          
          CRITÉRIOS OBRIGATÓRIOS:
          1. Localização: Devem ser estabelecimentos no Brasil.
          2. Dados de Contato: Priorize empresas que tenham WhatsApp e/ou E-mail. Se tiver Instagram, ele DEVE ter sido movimentado em 2026 (não mande contas inativas).
          3. Sem Site: As empresas NÃO podem ter um site registrado no Google ou Google Maps (pois ofereceremos o serviço de criação de sites).
          4. Google Maps: Forneça o link do Google Maps para o estabelecimento.
          5. Dados REAIS: Forneça WhatsApp, E-mail e Instagram REAIS. Se encontrar os três, é o ideal. NÃO INVENTE DADOS.
          6. Serviço Sugerido: Como o foco agora é também venda de sites, priorize "Criação de Site" como serviço sugerido para empresas que não o possuem.
          
          Retorne APENAS JSON no formato:
          {"leads": [{"name": "...", "industry": "...", "instagram": "...", "email": "...", "whatsapp": "...", "googleMapsLink": "...", "description": "...", "suggestedService": "...", "language": "pt-BR"}]}
          
          Atenção: O campo 'language' deve ser 'pt-BR' para empresas no Brasil.`
        },
        {
          role: "user",
          content: `Gere 10 leads B2B reais no Brasil (SMBs sem site no Google Maps) para prospecção hoje (${date}). 
          Requisitos: 
          - Devem ter WhatsApp ou E-mail.
          - Se tiver Instagram, deve estar ativo em 2026.
          - Inclua o link do Google Maps.
          - Foco em venda de sites e automação.
          Retorne exatamente 10 leads reais.`
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

