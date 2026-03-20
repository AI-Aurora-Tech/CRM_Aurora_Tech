import fetch from "node-fetch";

async function run() {
  const seedRes = await fetch("http://localhost:3000/api/auth/seed");
  console.log("Seed:", await seedRes.text());
}
run();
