import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  const date = "2026-04-09";
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
        content: `Busque na sua base de dados 10 leads B2B REAIS do Brasil. 
        Requisitos: 
        - Empresas que realmente existem.
        - Contatos (Insta, Whats, Email) DEVEM ser reais. Se não souber o real, deixe a string vazia "". NÃO INVENTE.
        - Devem ter pelo menos UM contato preenchido.
        Retorne exatamente 10 leads no formato JSON.`
      }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
    max_tokens: 3000,
    temperature: 0.5
  });
  console.log(completion.choices[0].message.content);
}
test().catch(console.error);
