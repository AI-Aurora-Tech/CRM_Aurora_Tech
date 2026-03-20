import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "Você é um assistente especializado em gerar leads B2B qualificados no Brasil. Retorne APENAS um JSON válido contendo um objeto com a propriedade 'leads'."
      },
      {
        role: "user",
        content: `Gere uma lista com 10 exemplos de leads B2B no Brasil para o dia 2026-03-20.
        1. Podem ser empresas reais ou exemplos altamente realistas de negócios locais.
        2. Foco: Escolas, clínicas de estética, oficinas, padarias e negócios de atendimento local.
        3. É OBRIGATÓRIO retornar exatamente 10 empresas.
        4. CONTATOS: Gere contatos de exemplo (Instagram, E-mail, WhatsApp) que pareçam reais, ou deixe vazio se preferir.
        5. Retorne um JSON com a seguinte estrutura exata:
        {
          "leads": [
            {
              "name": "Nome da Empresa",
              "industry": "Ramo de Atividade",
              "instagram": "@instagram_exemplo",
              "email": "email@exemplo.com",
              "whatsapp": "11999999999",
              "description": "Por que é um bom lead"
            }
          ]
        }
        IMPORTANTE: Você DEVE retornar 10 empresas na lista.`
      }
    ],
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
  });
  console.log(completion.choices[0].message.content);
}
run();
