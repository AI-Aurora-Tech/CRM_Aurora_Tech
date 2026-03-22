import fetch from "node-fetch";

async function run() {
  const res = await fetch("http://localhost:3000/api/test-users");
  const data = await res.json();
  console.log(res.status, data);
}

run();
