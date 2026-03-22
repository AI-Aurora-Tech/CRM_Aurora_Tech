import { generateDailyLeads } from "./src/lib/leadService.js";

async function run() {
  try {
    const leads = await generateDailyLeads("2026-03-22");
    console.log("Leads generated:", leads.length);
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
