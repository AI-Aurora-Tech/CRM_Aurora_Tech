import express from "express";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "aurora-super-secret-key";

// Supabase initialization
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
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

// --- Auth Routes ---
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(`Tentativa de login para: ${email}`);
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ERRO: Variáveis de ambiente do Supabase não configuradas!");
    return res.status(500).json({ error: "Configuração do servidor incompleta (Supabase)" });
  }

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      console.error(`Erro Supabase para ${email}:`, error.message);
      // Se for erro de tabela não encontrada ou algo assim, avisar
      return res.status(401).json({ error: `Erro no banco de dados: ${error.message}` });
    }

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
    .select("*")
    .eq("user_id", req.user.id);

  if (error) {
    console.warn("Aviso: Erro ao buscar leads (a tabela pode não existir):", error.message);
    return res.json([]); // Retorna array vazio para não quebrar o frontend
  }

  const mappedLeads = (leads || []).map(l => ({
    id: l.id,
    name: l.name,
    industry: l.industry,
    description: l.description,
    generatedAt: l.generated_at ? l.generated_at.split('T')[0] : l.generated_at, // Garante apenas a data YYYY-MM-DD
    contact: {
      instagram: l.instagram,
      email: l.email
    }
  }));
  res.json(mappedLeads);
});

app.post("/api/leads", authenticateToken, async (req: any, res) => {
  const leads = req.body;
  const leadsToInsert = leads.map((l: any) => ({
    id: l.id || uuidv4(), // Usa o ID gerado no frontend para manter consistência
    user_id: req.user.id,
    name: l.name,
    industry: l.industry,
    instagram: l.contact?.instagram || l.instagram,
    email: l.contact?.email || l.email,
    description: l.description,
    generated_at: l.generatedAt
  }));
  
  const { error } = await supabase.from("leads").insert(leadsToInsert);
  if (error) {
    console.error("Erro ao inserir leads no banco:", error.message);
    return res.status(500).json({ error: error.message });
  }
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

export default app;
