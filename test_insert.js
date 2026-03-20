import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users } = await supabase.from('users').select('id').limit(1);
  const userId = users[0].id;
  
  const lead = {
    id: uuidv4(),
    user_id: userId,
    name: "Test Lead",
    industry: "Test",
    instagram: "test",
    email: "test@test.com",
    whatsapp: "11999999999",
    description: "Test",
    generated_at: "2026-03-20",
    status: "Novo"
  };
  
  const { error } = await supabase.from('leads').insert([lead]);
  console.log("Insert error:", error);
}
run();
