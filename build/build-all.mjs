import { spawnSync } from "node:child_process";

const steps = [
  { name: "carrières", command: "npm", args: ["run", "pack:carrieres"] },
  { name: "talents", command: "npm", args: ["run", "pack:talents"] },
  { name: "livres", command: "npm", args: ["run", "pack:livres"] },
];

let hasError = false;

for (const step of steps) {
  console.log(`\n=== Build ${step.name} ===`);

  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: true
  });

  if (result.status !== 0) {
    hasError = true;
  }
}

if (hasError) {
  console.error("\nBuild global: ÉCHEC");
  process.exit(1);
}

console.log("\nBuild global: OK");