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
          content: `Você é um especialista em prospecção B2B focado EXCLUSIVAMENTE no BRASIL.
          Sua tarefa é listar EXATAMENTE 10 empresas REAIS de PEQUENO E MÉDIO PORTE (SMBs) no Brasil.
          
          CRITÉRIOS OBRIGATÓRIOS E CRÍTICOS:
          1. Apenas BRASIL.
          2. OBRIGATÓRIO ter 10 leads no JSON final. Nunca retorne menos que 10.
          3. Tamanho da Empresa: PEQUENO e MÉDIO porte. (Sem franquias gigantes como SmartFit, Outback, Coco Bambu).
          4. INSTAGRAM 100% REAL E MUITO ATIVO (REGRA DE OURO): 
             - O maior erro anterior foi inventar @ de Instagram que não existem ou de contas inativas.
             - Você está PROIBIDO de adivinhar ou chutar o @. 
             - Escolha APENAS empresas que você SABE que têm uma presença digital fortíssima, que produzem muito conteúdo (Reels, Stories) e são referência em marketing digital no seu nicho local (ex: marcas de roupas independentes, cafeterias "instagramáveis", clínicas de estética de alto padrão, e-commerces de nicho).
             - Se você não tem certeza absoluta do @ exato, NÃO use essa empresa. Escolha outra.
          5. Empresas REAIS: Nada de nomes genéricos. Pense em negócios locais de destaque.
          6. WhatsApp/Email: Se souber o real, coloque. Se não souber, deixe em branco ("").
          7. Google Maps: Crie um link de busca do Google Maps com o nome real da empresa e a cidade.
          
          Retorne APENAS JSON no formato:
          {"leads": [{"name": "...", "industry": "...", "instagram": "...", "email": "...", "whatsapp": "...", "googleMapsLink": "...", "description": "...", "suggestedService": "...", "language": "pt-BR"}]}
          `
        },
        {
          role: "user",
          content: `Gere exatamente 10 leads B2B REAIS do Brasil para prospecção em ${date}.
          - Apenas Brasil.
          - OBRIGATÓRIO 10 leads.
          - PEQUENO E MÉDIO PORTE.
          - INSTAGRAM DEVE SER 100% REAL E MUITO ATIVO (empresas com forte presença digital). NÃO INVENTE O @.
          - Sugira um serviço de tecnologia específico.
          - Retorne no formato JSON.`
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

