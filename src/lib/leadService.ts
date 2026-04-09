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
          content: `Você é um pesquisador de mercado B2B altamente preciso. Sua tarefa é buscar na sua base de conhecimento 10 empresas REAIS de pequeno e médio porte (SMBs).
          
          CRITÉRIOS OBRIGATÓRIOS E ESTRITOS:
          1. Localização: Países que falam Português (Brasil, Portugal, etc.) ou Inglês (EUA, Reino Unido, etc.).
          2. Empresas 100% REAIS: Use nomes reais, descrições reais e cidades reais. NÃO INVENTE NADA.
          3. Contatos REAIS: A empresa DEVE ter pelo menos uma rede social ou contato direto real e público. Priorize Instagram e WhatsApp. 
             - Se você não tem certeza absoluta do @ do Instagram, do número do WhatsApp ou do E-mail real, NÃO INVENTE. Deixe em branco ("").
             - Se a empresa não tiver NENHUM contato real conhecido por você, IGNORE-A e busque outra.
          4. Atividade Recente: Priorize empresas que são ativas nas redes sociais (assuma atividade em 2026).
          5. Sem Site: Priorize empresas que, até onde você sabe, operam apenas via redes sociais/Google Maps e não possuem site próprio.
          6. Google Maps: Crie um link de busca do Google Maps com o nome real da empresa e a cidade.
          
          Retorne APENAS JSON no formato:
          {"leads": [{"name": "...", "industry": "...", "instagram": "...", "email": "...", "whatsapp": "...", "googleMapsLink": "...", "description": "...", "suggestedService": "...", "language": "pt-BR" | "en"}]}
          `
        },
        {
          role: "user",
          content: `Busque na sua base de dados 10 leads B2B REAIS. 
          Requisitos: 
          - SMBs em países de língua portuguesa ou inglesa.
          - Empresas que realmente existem.
          - Contatos (Insta, Whats, Email) DEVEM ser reais. Priorize Insta e Whats. Se não tiver nenhum, ignore a empresa.
          - Instagram movimentado em 2026.
          - Sem site registrado.
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

