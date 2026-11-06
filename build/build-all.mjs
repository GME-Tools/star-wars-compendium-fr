import { spawnSync } from "node:child_process";

const steps = [
  { name: "ameliorations", command: "npm", args: ["run", "pack:ameliorations"] },
  { name: "armes", command: "npm", args: ["run", "pack:armes"] },
  { name: "armes_vaisseaux", command: "npm", args: ["run", "pack:armes_vaisseaux"] },
  { name: "armures", command: "npm", args: ["run", "pack:armures"] },
  { name: "aventures", command: "npm", args: ["run", "pack:aventures"] },
  { name: "capacites", command: "npm", args: ["run", "pack:capacites"] },
  { name: "capacites_emblematiques", command: "npm", args: ["run", "pack:capacites_emblematiques"] },
  { name: "carrières", command: "npm", args: ["run", "pack:carrieres"] },
  { name: "critiques", command: "npm", args: ["run", "pack:critiques"] },
  { name: "degats_critiques", command: "npm", args: ["run", "pack:degats_critiques"] },
  { name: "equipement", command: "npm", args: ["run", "pack:equipement"] },
  { name: "especes", command: "npm", args: ["run", "pack:especes"] },
  { name: "historiques", command: "npm", args: ["run", "pack:historiques"] },
  { name: "livres", command: "npm", args: ["run", "pack:livres"] },
  { name: "motivations", command: "npm", args: ["run", "pack:motivations"] },
  { name: "obligations", command: "npm", args: ["run", "pack:obligations"] },
  { name: "pnj", command: "npm", args: ["run", "pack:pnj"] },
  { name: "pouvoirs-de-force", command: "npm", args: ["run", "pack:pouvoirs-de-force"] },
  { name: "qualites", command: "npm", args: ["run", "pack:qualites"] },
  { name: "specialites", command: "npm", args: ["run", "pack:specialites"] },
  { name: "talents", command: "npm", args: ["run", "pack:talents"] },
  { name: "vaisseaux", command: "npm", args: ["run", "pack:vaisseaux"] }
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