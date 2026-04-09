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
        content: `Você é um especialista em prospecção B2B e pesquisa de mercado. Sua tarefa é encontrar 10 empresas REAIS de pequeno e médio porte (SMBs) em países que falam Português (Brasil) ou Inglês (EUA, Reino Unido, Canadá, etc.).
        
        CRITÉRIOS OBRIGATÓRIOS:
        1. Localização: Brasil ou países de língua inglesa.
        2. Dados de Contato: Devem ter WhatsApp real, E-mail real e Instagram real. O Instagram DEVE ter postagens em 2026.
        3. Sem Site/App: As empresas NÃO podem ter site ou aplicativo registrado na internet.
        4. Google Maps: Devem estar no Google Maps e ter pelo menos 100 avaliações. Forneça o link direto.
        5. Dados REAIS: NÃO INVENTE DADOS. Se não encontrar os 3 contatos (Whats, Email, Insta), não inclua a empresa.
        6. Serviço Sugerido: Analise o negócio e sugira um serviço específico (ex: App de agendamento, Sistema de Gerenciamento, Criação de Site, Automação de CRM).
        
        Retorne APENAS JSON no formato:
        {"leads": [{"name": "...", "industry": "...", "instagram": "...", "email": "...", "whatsapp": "...", "googleMapsLink": "...", "description": "...", "suggestedService": "...", "language": "pt-BR" | "en"}]}
        
        Atenção: O campo 'language' deve refletir o idioma do país da empresa.`
      },
      {
        role: "user",
        content: `Gere 10 leads B2B reais (Brasil ou países de língua inglesa) para prospecção em ${date}. 
        Requisitos: 
        - SMBs sem site/app no Google Maps com >100 avaliações.
        - WhatsApp, E-mail e Instagram (ativo em 2026) OBRIGATÓRIOS.
        - Inclua link do Google Maps.
        - Sugira um serviço de tecnologia específico para cada um.
        Retorne exatamente 10 leads reais.`
      }
    ],
    model: "gpt-4o",
    max_tokens: 3000,
    temperature: 0.5
  });
  console.log(completion.choices[0].message.content);
}
test().catch(console.error);
