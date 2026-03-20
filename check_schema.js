import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_schema_info', { table_name: 'leads' });
  if (error) {
    console.log("RPC failed, trying fallback");
    const { data: leads, error: leadsError } = await supabase.from('leads').select('*').limit(1);
    console.log("Leads sample:", leads);
    console.log("Error:", leadsError);
  } else {
    console.log("Schema:", data);
  }
}
run();
