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
        Sua tarefa é listar EXATAMENTE 10 empresas REAIS de PEQUENO E MÉDIO PORTE (SMBs) no Brasil.
        
        CRITÉRIOS OBRIGATÓRIOS:
        1. Apenas BRASIL.
        2. OBRIGATÓRIO ter 10 leads no JSON final. Nunca retorne menos que 10.
        3. Tamanho da Empresa: PEQUENO e MÉDIO porte. 
           - PROIBIDO empresas gigantes, franquias nacionais ou lugares extremamente famosos (Ex: Não use Coco Bambu, Paris 6, Mocotó, SmartFit).
        4. Empresas REAIS (Sem invenção): 
           - PROIBIDO inventar nomes genéricos (Ex: "Padaria Pão Quente", "Clínica Sorriso", "Mercado Central").
           - Para encontrar empresas reais, pense em bairros específicos de capitais ou cidades médias (ex: Savassi em BH, Boa Viagem em Recife, Meireles em Fortaleza) e lembre-se de negócios locais REAIS e ESPECÍFICOS que existem lá.
        5. Instagram REAL e ATIVO: Forneça o @ exato e real. Assuma que eles têm publicações em 2026.
        6. WhatsApp/Email: Se souber o real, coloque. Se não souber, deixe em branco ("").
        7. Google Maps: Crie um link de busca do Google Maps com o nome real da empresa e a cidade.
        
        Retorne APENAS JSON no formato:
        {"leads": [{"name": "...", "industry": "...", "instagram": "...", "email": "...", "whatsapp": "...", "googleMapsLink": "...", "description": "...", "suggestedService": "...", "language": "pt-BR"}]}
        `
      },
      {
        role: "user",
        content: `Gere exatamente 10 leads B2B REAIS do Brasil.
        - Apenas Brasil.
        - OBRIGATÓRIO 10 leads.
        - PEQUENO E MÉDIO PORTE (nada de empresas gigantes ou muito famosas).
        - EMPRESAS REAIS (nada de nomes genéricos inventados).
        - Instagram DEVE ser real e ter publicações em 2026.
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
