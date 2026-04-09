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
        content: `Você é um especialista em prospecção B2B focado EXCLUSIVAMENTE no BRASIL.
        Sua tarefa é listar EXATAMENTE 10 empresas REAIS no Brasil.
        
        CRITÉRIOS OBRIGATÓRIOS:
        1. Apenas BRASIL.
        2. OBRIGATÓRIO ter 10 leads no JSON final. Nunca retorne menos que 10.
        3. Instagram REAL: Para garantir que o Instagram existe, ESCOLHA EMPRESAS REAIS E CONHECIDAS (restaurantes famosos, lojas locais famosas, confeitarias famosas em São Paulo, Rio de Janeiro, etc). 
           Exemplos de nível de fama: @mocoto, @paris_6, @carlos_pizza, @brázpizzaria.
           NÃO INVENTE NOMES GENÉRICOS como "Padaria Pão Quente". Quero empresas de verdade que você conhece da sua base de dados.
        4. WhatsApp/Email: Se souber o real, coloque. Se não souber, deixe em branco ("").
        5. Google Maps: Crie um link de busca do Google Maps com o nome real da empresa e a cidade.
        
        Retorne APENAS JSON no formato:
        {"leads": [{"name": "...", "industry": "...", "instagram": "...", "email": "...", "whatsapp": "...", "googleMapsLink": "...", "description": "...", "suggestedService": "...", "language": "pt-BR"}]}
        `
      },
      {
        role: "user",
        content: `Gere exatamente 10 leads B2B REAIS do Brasil.
        - Apenas Brasil.
        - OBRIGATÓRIO 10 leads.
        - Instagram DEVE ser real e existir. Escolha empresas reais e conhecidas para não errar o @.
        - Não invente nomes genéricos.
        - Retorne no formato JSON.`
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
