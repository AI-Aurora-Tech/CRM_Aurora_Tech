import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "aurora-super-secret-key";

// Database initialization
const db = new Database("database.sqlite");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    clientName TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    dueDate TEXT,
    progress INTEGER DEFAULT 0,
    value REAL DEFAULT 0,
    assignedTo TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    type TEXT NOT NULL,
    FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    provider TEXT NOT NULL,
    paymentMethod TEXT NOT NULL,
    installments INTEGER,
    currentInstallment INTEGER,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    start TEXT NOT NULL,
    end TEXT NOT NULL,
    description TEXT,
    location TEXT,
    type TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    industry TEXT NOT NULL,
    instagram TEXT,
    email TEXT,
    description TEXT,
    generatedAt TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

// Seed users if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const defaultPassword = bcrypt.hashSync("aurora123", 10);
  const users = [
    { id: uuidv4(), email: "pedro@auroratech.com", name: "Pedro Santos" },
    { id: uuidv4(), email: "thomas@auroratech.com", name: "Thomas" },
    { id: uuidv4(), email: "geovanna@auroratech.com", name: "Geovanna" },
    { id: uuidv4(), email: "ivaldo@auroratech.com", name: "Ivaldo" },
  ];

  const insertUser = db.prepare("INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)");
  users.forEach(u => insertUser.run(u.id, u.email, defaultPassword, u.name));
  console.log("Default users created with password: aurora123");
}

app.use(express.json());

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
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.post("/api/auth/change-password", authenticateToken, (req: any, res) => {
  const { newPassword } = req.body;
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, req.user.id);
  res.json({ success: true });
});

// --- Data Routes ---

// Projects
app.get("/api/projects", authenticateToken, (req: any, res) => {
  const projects = db.prepare("SELECT * FROM projects WHERE userId = ?").all(req.user.id) as any[];
  const projectsWithTasks = projects.map(p => {
    const tasks = db.prepare("SELECT * FROM tasks WHERE projectId = ?").all(p.id);
    return { 
      ...p, 
      tasks: tasks.map((t: any) => ({ ...t, completed: !!t.completed })),
      assignedTo: p.assignedTo ? JSON.parse(p.assignedTo) : []
    };
  });
  res.json(projectsWithTasks);
});

app.post("/api/projects", authenticateToken, (req: any, res) => {
  const { name, clientName, description, status, dueDate, progress, value, tasks, assignedTo } = req.body;
  const projectId = uuidv4();
  db.prepare("INSERT INTO projects (id, userId, name, clientName, description, status, dueDate, progress, value, assignedTo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(projectId, req.user.id, name, clientName, description, status, dueDate, progress || 0, value || 0, JSON.stringify(assignedTo || []));
  
  if (tasks && Array.isArray(tasks)) {
    const insertTask = db.prepare("INSERT INTO tasks (id, projectId, title, completed, type) VALUES (?, ?, ?, ?, ?)");
    tasks.forEach((t: any) => insertTask.run(uuidv4(), projectId, t.title, t.completed ? 1 : 0, t.type));
  }
  res.json({ id: projectId });
});

app.patch("/api/projects/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  
  if (updates.assignedTo) {
    updates.assignedTo = JSON.stringify(updates.assignedTo);
  }

  const fields = Object.keys(updates).filter(k => k !== 'tasks').map(k => `${k} = ?`).join(", ");
  const values = Object.keys(updates).filter(k => k !== 'tasks').map(k => updates[k]);
  
  if (fields) {
    db.prepare(`UPDATE projects SET ${fields} WHERE id = ? AND userId = ?`).run(...values, id, req.user.id);
  }
  res.json({ success: true });
});

app.delete("/api/projects/:id", authenticateToken, (req: any, res) => {
  db.prepare("DELETE FROM projects WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Tasks
app.post("/api/projects/:projectId/tasks", authenticateToken, (req: any, res) => {
  const { projectId } = req.params;
  const { title, completed, type } = req.body;
  const taskId = uuidv4();
  db.prepare("INSERT INTO tasks (id, projectId, title, completed, type) VALUES (?, ?, ?, ?, ?)")
    .run(taskId, projectId, title, completed ? 1 : 0, type);
  res.json({ id: taskId });
});

app.patch("/api/tasks/:id", authenticateToken, (req: any, res) => {
  const { completed } = req.body;
  db.prepare("UPDATE tasks SET completed = ? WHERE id = ?").run(completed ? 1 : 0, req.params.id);
  res.json({ success: true });
});

// Transactions
app.get("/api/transactions", authenticateToken, (req: any, res) => {
  const transactions = db.prepare("SELECT * FROM transactions WHERE userId = ?").all(req.user.id);
  res.json(transactions);
});

app.post("/api/transactions", authenticateToken, (req: any, res) => {
  const { date, description, amount, type, category, provider, paymentMethod, installments, currentInstallment } = req.body;
  
  if (paymentMethod === 'Cartão de Crédito' && installments && installments > 1 && !currentInstallment) {
    const baseAmount = amount / installments;
    const startDate = new Date(date);
    const insert = db.prepare("INSERT INTO transactions (id, userId, date, description, amount, type, category, provider, paymentMethod, installments, currentInstallment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    for (let i = 0; i < installments; i++) {
      const installmentDate = new Date(startDate);
      installmentDate.setMonth(startDate.getMonth() + i);
      const id = uuidv4();
      insert.run(
        id, 
        req.user.id, 
        installmentDate.toISOString().split('T')[0], 
        `${description} (${i + 1}/${installments})`, 
        baseAmount, 
        type, 
        category, 
        provider, 
        paymentMethod, 
        installments, 
        i + 1
      );
    }
    res.json({ success: true });
  } else {
    const id = uuidv4();
    db.prepare("INSERT INTO transactions (id, userId, date, description, amount, type, category, provider, paymentMethod, installments, currentInstallment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, req.user.id, date, description, amount, type, category, provider, paymentMethod, installments || null, currentInstallment || null);
    res.json({ id });
  }
});

// Events
app.get("/api/events", authenticateToken, (req: any, res) => {
  const events = db.prepare("SELECT * FROM events WHERE userId = ?").all(req.user.id);
  res.json(events);
});

app.post("/api/events", authenticateToken, (req: any, res) => {
  const { title, start, end, description, location, type } = req.body;
  const id = uuidv4();
  db.prepare("INSERT INTO events (id, userId, title, start, end, description, location, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, req.user.id, title, start, end, description, location, type);
  res.json({ id });
});

app.delete("/api/events/:id", authenticateToken, (req: any, res) => {
  db.prepare("DELETE FROM events WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Leads
app.get("/api/leads", authenticateToken, (req: any, res) => {
  const leads = db.prepare("SELECT * FROM leads WHERE userId = ?").all(req.user.id) as any[];
  const mappedLeads = leads.map(l => ({
    id: l.id,
    name: l.name,
    industry: l.industry,
    description: l.description,
    generatedAt: l.generatedAt,
    contact: {
      instagram: l.instagram,
      email: l.email
    }
  }));
  res.json(mappedLeads);
});

app.post("/api/leads", authenticateToken, (req: any, res) => {
  const leads = req.body;
  const insertLead = db.prepare("INSERT INTO leads (id, userId, name, industry, instagram, email, description, generatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  leads.forEach((l: any) => {
    insertLead.run(uuidv4(), req.user.id, l.name, l.industry, l.contact?.instagram || l.instagram, l.contact?.email || l.email, l.description, l.generatedAt);
  });
  res.json({ success: true });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile("dist/index.html", { root: "." });
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
