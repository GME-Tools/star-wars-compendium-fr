import { spawnSync } from "node:child_process";

const steps = [
  { name: "carrières", script: "build/validation/careers.mjs" },
  { name: "talents", script: "build/validation/talents.mjs" }
];

let hasError = false;

for (const step of steps) {
  console.log(`\n=== Validation ${step.name} ===`);
  const result = spawnSync(process.execPath, [step.script], {
    stdio: "inherit"
  });

  if (result.status !== 0) {
    hasError = true;
  }
}

if (hasError) {
  console.error("\nValidation globale: ÉCHEC");
  process.exit(1);
}

console.log("\nValidation globale: OK");