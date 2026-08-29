import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const frontendRoot = resolve(repositoryRoot, "../filo-front");

const sharedDirectories = [
    ".agents/skills/tenant-isolation-review",
    ".agents/skills/authorization-review",
    ".agents/skills/api-contract-review",
    ".agents/skills/kanban-transition-review",
    ".agents/evals/github-pr-review",
    ".agents/evals/tenant-isolation-review",
    ".agents/evals/authorization-review",
    ".agents/evals/api-contract-review",
    ".agents/evals/kanban-transition-review",
];

const sharedFiles = [
    ".agents/evals/RUNBOOK.md",
    ".agents/evals/SCORING.md",
    ".agents/evals/result-template.json",
    ".agents/evals/show-case.mjs",
    ".agents/evals/validate-corpus.mjs",
    ".agents/evals/validate-skills.mjs",
];

function listFiles(directory) {
    return readdirSync(directory)
        .flatMap((entry) => {
            const absolutePath = resolve(directory, entry);
            if (statSync(absolutePath).isDirectory()) {
                return listFiles(absolutePath);
            }
            return [absolutePath];
        })
        .sort();
}

function sha256(path) {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function compareFile(backendPath, frontendPath, label, failures) {
    if (!existsSync(backendPath) || !existsSync(frontendPath)) {
        failures.push(`${label}: ausente em um dos repositórios`);
        return;
    }
    if (sha256(backendPath) !== sha256(frontendPath)) {
        failures.push(`${label}: conteúdo divergente`);
    }
}

if (!existsSync(frontendRoot)) {
    console.error(`Frontend irmão não encontrado em ${frontendRoot}`);
    process.exit(1);
}

const failures = [];

for (const directory of sharedDirectories) {
    const backendDirectory = resolve(repositoryRoot, directory);
    const frontendDirectory = resolve(frontendRoot, directory);

    if (!existsSync(backendDirectory) || !existsSync(frontendDirectory)) {
        failures.push(`${directory}: diretório ausente em um dos repositórios`);
        continue;
    }

    const backendFiles = listFiles(backendDirectory).map((path) =>
        relative(backendDirectory, path),
    );
    const frontendFiles = listFiles(frontendDirectory).map((path) =>
        relative(frontendDirectory, path),
    );
    const names = new Set([...backendFiles, ...frontendFiles]);

    for (const name of names) {
        compareFile(
            resolve(backendDirectory, name),
            resolve(frontendDirectory, name),
            `${directory}/${name}`,
            failures,
        );
    }
}

for (const file of sharedFiles) {
    compareFile(resolve(repositoryRoot, file), resolve(frontendRoot, file), file, failures);
}

if (failures.length > 0) {
    console.error("Sincronização inválida:\n");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log(
    `Sincronização válida: ${sharedDirectories.length} diretórios e ${sharedFiles.length} arquivos compartilhados.`,
);
