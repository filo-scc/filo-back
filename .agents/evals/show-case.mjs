import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const evalRoot = dirname(fileURLToPath(import.meta.url));
const [skill, caseId] = process.argv.slice(2);

if (!skill || !caseId || !/^[a-z0-9-]+$/.test(skill) || !/^[A-Z]+-[PNAIS]\d{2}$/.test(caseId)) {
    process.stderr.write("Uso: node .agents/evals/show-case.mjs <skill> <CASE-ID>\n");
    process.exit(1);
}

const registry = JSON.parse(readFileSync(join(evalRoot, "registry.json"), "utf8"));
if (!registry.skills.includes(skill)) {
    process.stderr.write(`Skill não registrada: ${skill}\n`);
    process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(evalRoot, skill, "cases.json"), "utf8"));
const item = manifest.cases.find((candidate) => candidate.id === caseId);
if (!item) {
    process.stderr.write(`Caso não encontrado: ${caseId}\n`);
    process.exit(1);
}

process.stdout.write(
    `Skill: $${skill}\nCaso: ${item.id}\n\nPedido:\n${item.prompt}\n\nArtefato sanitizado:\n${item.fixture}\n`,
);
