import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = "pedro@auroratech.com";
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .limit(1);
    
  console.log("Users:", users);
  console.log("Error:", error);
  console.log("URL:", supabaseUrl);
  console.log("Key:", supabaseKey.substring(0, 10) + "...");
  console.log("Key Length:", supabaseKey.length);
  console.log("URL Length:", supabaseUrl.length);
}

run();
