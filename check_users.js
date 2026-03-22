import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wiuhbjyoynjvzyuvjdsg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdWhianlveW5qdnp5dXZqZHNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjYzMDQ5MCwiZXhwIjoyMDg4MjA2NDkwfQ.JZYtlTJtMrN6FSM4AGBkj2gqCZoBeGPtJwqYqC44dzw";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from("users").select("email");
  data.forEach(d => console.log(`'${d.email}'`));
}

run();
