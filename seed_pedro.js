import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const supabaseUrl = "https://wiuhbjyoynjvzyuvjdsg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdWhianlveW5qdnp5dXZqZHNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjYzMDQ5MCwiZXhwIjoyMDg4MjA2NDkwfQ.JZYtlTJtMrN6FSM4AGBkj2gqCZoBeGPtJwqYqC44dzw";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = "pedro@auroratech.com";
  const password = "admin"; // Default password
  const hashedPassword = bcrypt.hashSync(password, 10);

  const { data, error } = await supabase.from("users").insert({
    id: uuidv4(),
    email,
    password: hashedPassword,
    name: "Pedro"
  });

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! User pedro@auroratech.com created with password 'admin'");
  }
}

run();
