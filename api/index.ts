import express from "express";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import { generateDailyLeads } from "../src/lib/leadService";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "aurora-super-secret-key";

// Supabase initialization
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder";

if (supabaseUrl === "https://placeholder.supabase.co" || supabaseKey === "placeholder") {
  console.error("⚠️ AVISO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estão configurados!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    supabase: {
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasJwt: !!process.env.JWT_SECRET
    }
  });
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.get("/api/debug/leads", async (req, res) => {
  const { data: leads, error: leadsError } = await supabase.from("leads").select("*").limit(5);
  const { data: users, error: usersError } = await supabase.from("users").select("*").limit(5);
  res.json({ 
    leads, 
    users, 
    leadsError, 
    usersError,
    hasUrl: !!process.env.SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY
  });
});

// --- Auth Routes ---
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(`Tentativa de login para: ${email}`);
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ERRO: Variáveis de ambiente do Supabase não configuradas!");
    return res.status(500).json({ error: "Configuração do servidor incompleta (Supabase)" });
  }

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) {
      console.error(`Erro Supabase para ${email}:`, error.message);
      // Se for erro de tabela não encontrada ou algo assim, avisar
      return res.status(401).json({ error: `Erro no banco de dados: ${error.message}` });
    }

    const user = users && users.length > 0 ? users[0] : null;

    if (!user) {
      console.log(`Usuário não encontrado: ${email}`);
      return res.status(401).json({ error: "Usuário não encontrado. Você já rodou a rota /api/auth/seed?" });
    }

    // Debug: Verificar se a senha no banco parece um hash bcrypt (começa com $2a$ ou $2b$)
    if (!user.password.startsWith('$2')) {
      console.warn(`AVISO: A senha do usuário ${email} no banco de dados NÃO parece estar criptografada com bcrypt. Tentando comparação direta...`);
      if (password === user.password) {
        console.log("Login bem-sucedido via comparação direta (NÃO RECOMENDADO EM PRODUÇÃO)");
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET);
        return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
      }
    }

    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    if (!isPasswordCorrect) {
      console.log(`Senha incorreta para: ${email}`);
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err: any) {
    console.error("Erro fatal no login:", err);
    res.status(500).json({ error: err.message });
  }
});

// Temporary route to seed a default user if none exists
app.get("/api/auth/seed", async (req, res) => {
  try {
    const email = "admin@auroratech.com";
    const password = "admin";
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    console.log("Iniciando processo de seed...");

    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Erro ao buscar usuário existente no seed:", fetchError.message);
      return res.status(500).json({ error: fetchError.message });
    }

    if (existingUser) {
      console.log("Usuário admin já existe no banco.");
      return res.json({ message: "Usuário já existe", email });
    }

    const { error: insertError } = await supabase
      .from("users")
      .insert({
        id: uuidv4(),
        email,
        password: hashedPassword,
        name: "Administrador"
      });

    if (insertError) {
      console.error("Erro ao inserir usuário no seed:", insertError.message);
      return res.status(500).json({ error: insertError.message });
    }

    console.log("Usuário admin criado com sucesso!");
    res.json({ message: "Usuário criado com sucesso!", email, password });
  } catch (err: any) {
    console.error("Erro fatal no seed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/change-password", authenticateToken, async (req: any, res) => {
  const { newPassword } = req.body;
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  
  const { error } = await supabase
    .from("users")
    .update({ password: hashedPassword })
    .eq("id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- Data Routes ---

// Projects
app.get("/api/projects", authenticateToken, async (req: any, res) => {
  const { data: projects, error: pError } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", req.user.id);

  if (pError) return res.status(500).json({ error: pError.message });

  const projectsWithTasks = await Promise.all(projects.map(async (p) => {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", p.id);
    
    return { 
      ...p, 
      userId: p.user_id, // Map for frontend
      clientName: p.client_name,
      dueDate: p.due_date,
      paymentMethod: p.payment_method,
      paymentDetails: p.payment_details,
      implementationFee: p.implementation_fee,
      monthlyFee: p.monthly_fee,
      tasks: (tasks || []).map((t: any) => ({ ...t, completed: !!t.completed })),
      assignedTo: ['Você'] // Default value since column is missing in DB
    };
  }));
  
  res.json(projectsWithTasks);
});

app.post("/api/projects", authenticateToken, async (req: any, res) => {
  const { name, clientName, description, status, dueDate, progress, value, tasks, paymentMethod, paymentDetails, implementationFee, monthlyFee } = req.body;
  const projectId = uuidv4();
  
  console.log("Tentando criar projeto:", { name, clientName, projectId, userId: req.user.id });

  const projectData: any = {
    id: projectId,
    user_id: req.user.id,
    name,
    client_name: clientName,
    description,
    status,
    due_date: dueDate,
    progress: progress || 0,
    value: value || 0,
    payment_method: paymentMethod,
    payment_details: paymentDetails,
    implementation_fee: implementationFee,
    monthly_fee: monthlyFee
  };

  let { error: pError } = await supabase.from("projects").insert(projectData);

  // Fallback se colunas financeiras novas não existirem
  if (pError && (pError.message.includes("column") || pError.message.includes("schema cache"))) {
    console.warn("Aviso: Algumas colunas novas podem estar faltando na tabela 'projects'. Tentando inserção simplificada...");
    const fallbackData = {
      id: projectId,
      user_id: req.user.id,
      name,
      client_name: clientName,
      description,
      status,
      due_date: dueDate,
      progress: progress || 0,
      value: value || 0
    };
    const { error: retryError } = await supabase.from("projects").insert(fallbackData);
    pError = retryError;
  }

  if (pError) {
    console.error("Erro ao inserir projeto no Supabase:", pError);
    return res.status(500).json({ error: pError.message });
  }
  
  if (tasks && Array.isArray(tasks) && tasks.length > 0) {
    console.log(`Inserindo ${tasks.length} tarefas para o projeto ${projectId}`);
    const tasksToInsert = tasks.map(t => ({
      id: uuidv4(),
      project_id: projectId,
      title: t.title,
      completed: !!t.completed,
      type: t.type
    }));
    const { error: tError } = await supabase.from("tasks").insert(tasksToInsert);
    if (tError) {
      console.error("Erro ao inserir tarefas no Supabase:", tError);
    }
  }
  
  console.log("Projeto criado com sucesso:", projectId);
  res.json({ id: projectId });
});

app.patch("/api/projects/:id", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  
  const dbUpdates: any = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.clientName) dbUpdates.client_name = updates.clientName;
  if (updates.description) dbUpdates.description = updates.description;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.dueDate) dbUpdates.due_date = updates.dueDate;
  if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
  if (updates.value !== undefined) dbUpdates.value = updates.value;
  if (updates.paymentMethod) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.paymentDetails) dbUpdates.payment_details = updates.paymentDetails;
  if (updates.implementationFee !== undefined) dbUpdates.implementation_fee = updates.implementationFee;
  if (updates.monthlyFee !== undefined) dbUpdates.monthly_fee = updates.monthlyFee;

  let { error } = await supabase
    .from("projects")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", req.user.id);

  // Fallback se colunas novas não existirem no update
  if (error && (error.message.includes("column") || error.message.includes("schema cache"))) {
    const safeUpdates: any = {};
    if (updates.name) safeUpdates.name = updates.name;
    if (updates.clientName) safeUpdates.client_name = updates.clientName;
    if (updates.description) safeUpdates.description = updates.description;
    if (updates.status) safeUpdates.status = updates.status;
    if (updates.dueDate) safeUpdates.due_date = updates.dueDate;
    if (updates.progress !== undefined) safeUpdates.progress = updates.progress;
    if (updates.value !== undefined) safeUpdates.value = updates.value;
    
    const { error: retryError } = await supabase
      .from("projects")
      .update(safeUpdates)
      .eq("id", id)
      .eq("user_id", req.user.id);
    error = retryError;
  }

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/projects/:id", authenticateToken, async (req: any, res) => {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Tasks
app.post("/api/projects/:projectId/tasks", authenticateToken, async (req: any, res) => {
  const { projectId } = req.params;
  const { title, completed, type } = req.body;
  const taskId = uuidv4();
  
  const { error } = await supabase
    .from("tasks")
    .insert({
      id: taskId,
      project_id: projectId,
      title,
      completed: completed ? 1 : 0,
      type
    });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: taskId });
});

app.patch("/api/tasks/:id", authenticateToken, async (req: any, res) => {
  const { completed, type, title } = req.body;
  const updates: any = {};
  if (completed !== undefined) updates.completed = !!completed;
  if (type !== undefined) updates.type = type;
  if (title !== undefined) updates.title = title;

  const { error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/tasks/:id", authenticateToken, async (req: any, res) => {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Transactions
app.get("/api/transactions", authenticateToken, async (req: any, res) => {
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  
  const mapped = (transactions || []).map(t => ({
    ...t,
    userId: t.user_id,
    paymentMethod: t.payment_method,
    currentInstallment: t.current_installment,
    status: t.status
  }));
  res.json(mapped);
});

app.post("/api/transactions", authenticateToken, async (req: any, res) => {
  const { date, description, amount, type, category, provider, paymentMethod, installments, currentInstallment, status } = req.body;
  
  if (paymentMethod === 'Cartão de Crédito' && installments && installments > 1 && !currentInstallment) {
    const baseAmount = amount / installments;
    const startDate = new Date(date);
    const transactionsToInsert = [];
    
    for (let i = 0; i < installments; i++) {
      const installmentDate = new Date(startDate);
      installmentDate.setMonth(startDate.getMonth() + i);
      transactionsToInsert.push({
        id: uuidv4(),
        user_id: req.user.id,
        date: installmentDate.toISOString().split('T')[0],
        description: `${description} (${i + 1}/${installments})`,
        amount: baseAmount,
        type,
        category,
        provider,
        payment_method: paymentMethod,
        installments,
        current_installment: i + 1,
        status: status || 'paid'
      });
    }
    const { error } = await supabase.from("transactions").insert(transactionsToInsert);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } else {
    const id = uuidv4();
    const { error } = await supabase
      .from("transactions")
      .insert({
        id,
        user_id: req.user.id,
        date,
        description,
        amount,
        type,
        category,
        provider,
        payment_method: paymentMethod,
        installments: installments || null,
        current_installment: currentInstallment || null,
        status: status || 'paid'
      });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id });
  }
});

app.patch("/api/transactions/:id", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  
  const dbUpdates: any = {};
  if (updates.date) dbUpdates.date = updates.date;
  if (updates.description) dbUpdates.description = updates.description;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.type) dbUpdates.type = updates.type;
  if (updates.category) dbUpdates.category = updates.category;
  if (updates.provider) dbUpdates.provider = updates.provider;
  if (updates.paymentMethod) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.status) dbUpdates.status = updates.status;

  const { error } = await supabase
    .from("transactions")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/transactions/:id", authenticateToken, async (req: any, res) => {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Events
app.get("/api/events", authenticateToken, async (req: any, res) => {
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  
  const mapped = (events || []).map(e => ({
    ...e,
    userId: e.user_id,
    start: e.start_time,
    end: e.end_time,
    tag: e.tag,
    color: e.color
  }));
  res.json(mapped);
});

app.post("/api/events", authenticateToken, async (req: any, res) => {
  const { title, start, end, description, location, type, tag, color } = req.body;
  const id = uuidv4();
  
  try {
    const eventData: any = {
      id,
      user_id: req.user.id,
      title,
      start_time: start,
      end_time: end,
      description,
      location,
      type,
      tag,
      color
    };

    let { error } = await supabase.from("events").insert(eventData);
      
    // Fallback se tag/color não existirem
    if (error && (error.message.includes("column") || error.message.includes("schema cache"))) {
      console.warn("Aviso: Colunas 'tag' ou 'color' podem estar faltando na tabela 'events'. Tentando inserção simplificada...");
      const fallbackData = {
        id,
        user_id: req.user.id,
        title,
        start_time: start,
        end_time: end,
        description,
        location,
        type
      };
      const { error: retryError } = await supabase.from("events").insert(fallbackData);
      error = retryError;
    }

    if (error) {
      console.error("Erro ao inserir evento no Supabase:", error);
      return res.status(500).json({ 
        error: error.message,
        details: "Certifique-se de que as colunas 'tag' e 'color' existem na tabela 'events' para usar essas funcionalidades."
      });
    }
    
    res.json({ id });
  } catch (err: any) {
    console.error("Erro fatal ao criar evento:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/events/:id", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  
  const dbUpdates: any = {};
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.start) dbUpdates.start_time = updates.start;
  if (updates.end) dbUpdates.end_time = updates.end;
  if (updates.description) dbUpdates.description = updates.description;
  if (updates.location) dbUpdates.location = updates.location;
  if (updates.type) dbUpdates.type = updates.type;
  if (updates.tag) dbUpdates.tag = updates.tag;
  if (updates.color) dbUpdates.color = updates.color;

  let { error } = await supabase
    .from("events")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", req.user.id);

  // Fallback para update se colunas novas não existirem
  if (error && (error.message.includes("column") || error.message.includes("schema cache"))) {
    const safeUpdates: any = {};
    if (updates.title) safeUpdates.title = updates.title;
    if (updates.start) safeUpdates.start_time = updates.start;
    if (updates.end) safeUpdates.end_time = updates.end;
    if (updates.description) safeUpdates.description = updates.description;
    if (updates.location) safeUpdates.location = updates.location;
    if (updates.type) safeUpdates.type = updates.type;
    
    const { error: retryError } = await supabase
      .from("events")
      .update(safeUpdates)
      .eq("id", id)
      .eq("user_id", req.user.id);
    error = retryError;
  }

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/events/:id", authenticateToken, async (req: any, res) => {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Leads
app.get("/api/leads", authenticateToken, async (req: any, res) => {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*");

  if (error) {
    console.warn("Aviso: Erro ao buscar leads (a tabela pode não existir):", error.message);
    return res.json([]); // Retorna array vazio para não quebrar o frontend
  }

  const mappedLeads = (leads || []).map(l => {
    let genAt = l.generated_at;
    if (!genAt) {
      // Se não tiver data de geração, usa a data de criação ou a data atual
      genAt = l.created_at ? l.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    } else {
      genAt = genAt.split('T')[0];
    }

    return {
      id: l.id,
      name: l.name,
      industry: l.industry,
      description: l.description,
      generatedAt: genAt,
      status: l.status || 'Novo',
      contact: {
        instagram: l.instagram,
        email: l.email,
        whatsapp: l.whatsapp
      }
    };
  });
  res.json(mappedLeads);
});

app.post("/api/leads", authenticateToken, async (req: any, res) => {
  const leads = Array.isArray(req.body) ? req.body : [req.body];
  
  // Buscar leads existentes para evitar duplicatas
  const { data: existingLeads } = await supabase
    .from("leads")
    .select("name, instagram, email");

  const existingNames = new Set((existingLeads || []).map(l => l.name.toLowerCase()));
  const existingInstas = new Set((existingLeads || []).map(l => l.instagram?.toLowerCase()).filter(Boolean));
  
  const leadsToInsert = leads
    .filter((l: any) => {
      const nameLower = l.name.toLowerCase();
      const instaLower = (l.contact?.instagram || l.instagram || "").toLowerCase();
      
      // Se já existe pelo nome ou instagram, ignora
      if (existingNames.has(nameLower)) return false;
      if (instaLower && existingInstas.has(instaLower)) return false;
      
      return true;
    })
    .map((l: any) => {
      let insta = (l.contact?.instagram || l.instagram || "").trim();
      let mail = (l.contact?.email || l.email || "").trim();
      let wpp = (l.contact?.whatsapp || l.whatsapp || "").trim();
      
      // Sanitização agressiva para evitar erros de CHECK constraint no banco
      if (insta.includes('instagram.com/')) {
        insta = insta.split('instagram.com/')[1].split('/')[0].split('?')[0];
      }
      insta = insta.replace(/[^a-zA-Z0-9._]/g, '');
      if (insta.length < 2) insta = "";
      
      if (!mail.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) mail = "";
      
      // Manter apenas números e o sinal de + no WhatsApp
      wpp = wpp.replace(/[^\d]/g, ''); // Remove tudo que não é dígito primeiro
      if (wpp.length > 0) {
        if (wpp.length === 10 || wpp.length === 11) {
          wpp = '+55' + wpp;
        } else if (wpp.startsWith('55')) {
          wpp = '+' + wpp;
        } else {
          wpp = '+' + wpp;
        }
      }
      if (wpp.length < 10) wpp = ""; // Um número com DDI tem pelo menos 10 caracteres
      
      const validStatuses = ['Novo', 'Em Contato', 'Em Negociação', 'Resposta Negativa', 'Convertido'];
      const status = validStatuses.includes(l.status) ? l.status : 'Novo';

      return {
        id: l.id || uuidv4(),
        user_id: req.user.id,
        name: l.name,
        industry: l.industry,
        instagram: insta === "" ? null : insta,
        email: mail === "" ? null : mail,
        whatsapp: wpp === "" ? null : wpp,
        description: l.description,
        generated_at: l.generatedAt,
        status: status
      };
    });
  
  if (leadsToInsert.length === 0) {
    return res.json({ success: true, message: "Nenhum lead novo para inserir (duplicatas ignoradas)" });
  }

  console.log("LEADS TO INSERT:", JSON.stringify(leadsToInsert, null, 2));
  const { error } = await supabase.from("leads").insert(leadsToInsert);
  
  if (error && (error.message.includes("column") || error.message.includes("schema cache"))) {
    // Fallback se a coluna 'status' ou 'whatsapp' não existir ainda
    const fallbackLeads = leadsToInsert.map(({ status, whatsapp, ...rest }) => rest);
    const { error: retryError } = await supabase.from("leads").insert(fallbackLeads);
    if (retryError) return res.status(500).json({ error: retryError.message });
    return res.json({ success: true, warning: "Colunas novas não encontradas, leads salvos com fallback." });
  }

  if (error) {
    console.error("Erro ao inserir leads no banco:", error.message);
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

app.patch("/api/leads/:id", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  
  const dbUpdates: any = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.industry) dbUpdates.industry = updates.industry;
  if (updates.description) dbUpdates.description = updates.description;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.contact?.instagram) dbUpdates.instagram = updates.contact.instagram;
  if (updates.contact?.email) dbUpdates.email = updates.contact.email;
  if (updates.contact?.whatsapp) dbUpdates.whatsapp = updates.contact.whatsapp;

  const { error } = await supabase
    .from("leads")
    .update(dbUpdates)
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/leads/:id", authenticateToken, async (req: any, res) => {
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  // Serve static files in production
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// --- CRON JOB: Geração Automática de Leads ---
// Endpoint para ser chamado pelo Vercel Cron
app.get("/api/cron/generate-leads", async (req, res) => {
  console.log("Executando CRON JOB: Geração de Leads Diários");
  
  // Opcional: Verificar um token de segurança para evitar chamadas indevidas
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 1. Buscar todos os usuários
    const { data: users, error: usersError } = await supabase.from("users").select("id, email");
    
    if (usersError || !users) {
      console.error("Erro ao buscar usuários para o cron job:", usersError);
      return res.status(500).json({ error: "Erro ao buscar usuários" });
    }

    // 2. Definir a data de hoje no fuso horário correto
    const now = new Date();
    const zonedDate = toZonedTime(now, "America/Sao_Paulo");
    const dateStr = format(zonedDate, "yyyy-MM-dd");

    let totalGenerated = 0;

    for (const user of users) {
      console.log(`Verificando leads para o usuário ${user.email} (${user.id})...`);
      
      // Verificar se já existem leads gerados hoje para este usuário
      const { data: existingLeads } = await supabase
        .from("leads")
        .select("id")
        .eq("user_id", user.id)
        .eq("generated_at", dateStr);

      if (existingLeads && existingLeads.length >= 10) {
        console.log(`Usuário ${user.email} já possui ${existingLeads.length} leads hoje. Pulando.`);
        continue;
      }

      // Gerar os leads via IA
      console.log(`Gerando novos leads para ${user.email}...`);
      const generatedLeads = await generateDailyLeads(dateStr);
      
      if (!generatedLeads || generatedLeads.length === 0) {
        console.log(`Nenhum lead gerado para ${user.email}.`);
        continue;
      }

      // Preparar para inserção no banco
      const leadsToInsert = generatedLeads.map((l: any) => {
        let insta = (l.contact?.instagram || l.instagram || "").trim();
        let mail = (l.contact?.email || l.email || "").trim();
        let wpp = (l.contact?.whatsapp || l.whatsapp || "").trim();
        
        // Sanitização agressiva
        if (insta.includes('instagram.com/')) {
          insta = insta.split('instagram.com/')[1].split('/')[0].split('?')[0];
        }
        insta = insta.replace(/[^a-zA-Z0-9._]/g, '');
        if (insta.length < 2) insta = "";
        
        if (!mail.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) mail = "";
        
        wpp = wpp.replace(/[^\d]/g, '');
        if (wpp.length > 0) {
          if (wpp.length === 10 || wpp.length === 11) {
            wpp = '+55' + wpp;
          } else if (wpp.startsWith('55')) {
            wpp = '+' + wpp;
          } else {
            wpp = '+' + wpp;
          }
        }
        if (wpp.length < 10) wpp = "";
        
        const validStatuses = ['Novo', 'Em Contato', 'Em Negociação', 'Resposta Negativa', 'Convertido'];
        const status = validStatuses.includes(l.status) ? l.status : 'Novo';

        return {
          id: l.id || uuidv4(),
          user_id: user.id,
          name: l.name,
          industry: l.industry,
          instagram: insta === "" ? null : insta,
          email: mail === "" ? null : mail,
          whatsapp: wpp === "" ? null : wpp,
          description: l.description,
          generated_at: dateStr,
          status: status
        };
      });

      // Inserir no banco
      const { error: insertError } = await supabase.from("leads").insert(leadsToInsert);
      
      if (insertError) {
        if (insertError.message.includes("column") || insertError.message.includes("schema cache")) {
          // Fallback se colunas novas não existirem
          const fallbackLeads = leadsToInsert.map(({ status, whatsapp, ...rest }) => rest);
          await supabase.from("leads").insert(fallbackLeads);
          console.log(`Leads salvos para ${user.email} (com fallback).`);
          totalGenerated += fallbackLeads.length;
        } else {
          console.error(`Erro ao salvar leads para ${user.email}:`, insertError.message);
        }
      } else {
        console.log(`Leads gerados e salvos para ${user.email} com sucesso!`);
        totalGenerated += leadsToInsert.length;
      }
    }
    
    res.json({ success: true, message: `CRON finalizado. ${totalGenerated} leads gerados no total.` });
  } catch (error: any) {
    console.error("Erro no CRON JOB de leads:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

export default app;
