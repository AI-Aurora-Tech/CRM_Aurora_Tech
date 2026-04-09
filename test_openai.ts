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
        content: `Você é um pesquisador de mercado B2B altamente preciso. Sua tarefa é buscar na sua base de conhecimento 10 empresas REAIS de pequeno e médio porte (SMBs).
        
        CRITÉRIOS OBRIGATÓRIOS E ESTRITOS:
        1. Localização: Países que falam Português (Brasil, Portugal, etc.) ou Inglês (EUA, Reino Unido, etc.).
        2. Empresas 100% REAIS: Use nomes reais, descrições reais e cidades reais. NÃO INVENTE NADA.
        3. Contatos REAIS: A empresa DEVE ter pelo menos uma rede social ou contato direto real e público. Priorize Instagram e WhatsApp. 
           - Se você não tem certeza absoluta do @ do Instagram, do número do WhatsApp ou do E-mail real, NÃO INVENTE.
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
  console.log(completion.choices[0].message.content);
}
test().catch(console.error);
