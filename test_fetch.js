import fetch from "node-fetch";

async function run() {
  const res = await fetch("http://localhost:3000/api/debug/leads");
  const data = await res.json();
  console.log("Debug leads:", JSON.stringify(data, null, 2));
}
run();
