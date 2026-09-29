import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const standardRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(standardRoot, "../..");
const legacyRoot = join(repoRoot, ".agents", "evals");
const skillsRoot = join(repoRoot, ".agents", "skills");
const requested = process.argv.slice(2);

if (requested.length === 0) {
    console.error("Uso: node convert-legacy-evals.mjs <skill> [skill...]");
    process.exit(2);
}

for (const skillName of requested) {
    const sourcePath = join(legacyRoot, skillName, "cases.json");
    const skillRoot = join(skillsRoot, skillName);
    const outputPath = join(skillRoot, "evals", "evals.json");

    if (!existsSync(sourcePath) || !existsSync(join(skillRoot, "SKILL.md"))) {
        console.error(`${skillName}: skill ou corpus legado ausente`);
        process.exitCode = 1;
        continue;
    }

    const source = JSON.parse(readFileSync(sourcePath, "utf8"));
    if (source.skill !== skillName || !Array.isArray(source.cases)) {
        console.error(`${skillName}: corpus legado inválido`);
        process.exitCode = 1;
        continue;
    }

    const evals = source.cases.map((item, index) => {
        const severity = Array.isArray(item.expected?.severity)
            ? ` Severidade aceitável: ${item.expected.severity.join(" ou ")}.`
            : "";
        const invariants = Array.isArray(item.expected?.invariants) && item.expected.invariants.length
            ? ` Invariantes: ${item.expected.invariants.join(", ")}.`
            : "";
        const mustCover = (item.expected?.must_cover ?? []).map((value) => `Deve cobrir: ${value}.`);
        const mustNot = (item.expected?.must_not ?? []).map((value) => `Não deve: ${value}.`);

        return {
            id: index + 1,
            case_id: item.id,
            category: item.category,
            prompt: `${item.prompt}\n\nContexto sanitizado:\n${item.fixture}`,
            expected_output: `Resultado esperado: ${item.expected?.outcome}.${severity}${invariants}`,
            files: [],
            expectations: [...mustCover, ...mustNot],
        };
    });

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify({ skill_name: skillName, evals }, null, 4)}\n`);
    console.log(`${skillName}: ${evals.length} casos convertidos para ${outputPath}`);
}
