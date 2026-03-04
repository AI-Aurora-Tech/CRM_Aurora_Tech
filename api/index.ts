import express from "express";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "aurora-super-secret-key";

// Supabase initialization
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
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
  
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
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
      tasks: (tasks || []).map((t: any) => ({ ...t, completed: !!t.completed })),
      assignedTo: p.assigned_to ? JSON.parse(p.assigned_to) : []
    };
  }));
  
  res.json(projectsWithTasks);
});

app.post("/api/projects", authenticateToken, async (req: any, res) => {
  const { name, clientName, description, status, dueDate, progress, value, tasks, assignedTo } = req.body;
  const projectId = uuidv4();
  
  const { error: pError } = await supabase
    .from("projects")
    .insert({
      id: projectId,
      user_id: req.user.id,
      name,
      client_name: clientName,
      description,
      status,
      due_date: dueDate,
      progress: progress || 0,
      value: value || 0,
      assigned_to: JSON.stringify(assignedTo || [])
    });

  if (pError) return res.status(500).json({ error: pError.message });
  
  if (tasks && Array.isArray(tasks)) {
    const tasksToInsert = tasks.map(t => ({
      id: uuidv4(),
      project_id: projectId,
      title: t.title,
      completed: t.completed ? 1 : 0,
      type: t.type
    }));
    await supabase.from("tasks").insert(tasksToInsert);
  }
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
  if (updates.assignedTo) dbUpdates.assigned_to = JSON.stringify(updates.assignedTo);

  const { error } = await supabase
    .from("projects")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", req.user.id);

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
  const { completed } = req.body;
  const { error } = await supabase
    .from("tasks")
    .update({ completed: completed ? 1 : 0 })
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
    currentInstallment: t.current_installment
  }));
  res.json(mapped);
});

app.post("/api/transactions", authenticateToken, async (req: any, res) => {
  const { date, description, amount, type, category, provider, paymentMethod, installments, currentInstallment } = req.body;
  
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
        current_installment: i + 1
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
        current_installment: currentInstallment || null
      });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id });
  }
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
    end: e.end_time
  }));
  res.json(mapped);
});

app.post("/api/events", authenticateToken, async (req: any, res) => {
  const { title, start, end, description, location, type } = req.body;
  const id = uuidv4();
  const { error } = await supabase
    .from("events")
    .insert({
      id,
      user_id: req.user.id,
      title,
      start_time: start,
      end_time: end,
      description,
      location,
      type
    });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id });
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

  if (error) return res.status(500).json({ error: error.message });

  const mappedLeads = (leads || []).map(l => ({
    id: l.id,
    name: l.name,
    industry: l.industry,
    description: l.description,
    generatedAt: l.generated_at,
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
    id: uuidv4(),
    user_id: req.user.id,
    name: l.name,
    industry: l.industry,
    instagram: l.contact?.instagram || l.instagram,
    email: l.contact?.email || l.email,
    description: l.description,
    generated_at: l.generatedAt
  }));
  
  const { error } = await supabase.from("leads").insert(leadsToInsert);
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
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
