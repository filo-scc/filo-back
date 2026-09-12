import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const evalRoot = dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(readFileSync(join(evalRoot, "registry.json"), "utf8"));
const validCategories = new Set(Object.keys(registry.minimum_categories));
const validOutcomes = new Set(["finding", "no_finding", "stop"]);
const validSeverities = new Set(["critica", "alta", "media", "baixa"]);
const errors = [];
let totalCases = 0;

function requireText(value, label) {
    if (typeof value !== "string" || value.trim().length < 8) {
        errors.push(`${label} deve ser texto substantivo`);
    }
}

for (const skill of registry.skills) {
    const path = join(evalRoot, skill, "cases.json");
    if (!existsSync(path)) {
        errors.push(`${skill}: cases.json ausente`);
        continue;
    }

    let manifest;
    try {
        manifest = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
        errors.push(`${skill}: JSON inválido (${error.message})`);
        continue;
    }

    if (manifest.skill !== skill) errors.push(`${skill}: campo skill divergente`);
    if (!Array.isArray(manifest.cases)) {
        errors.push(`${skill}: cases deve ser array`);
        continue;
    }

    const counts = Object.fromEntries([...validCategories].map((name) => [name, 0]));
    const ids = new Set();

    for (const [index, item] of manifest.cases.entries()) {
        const label = `${skill}[${index}]`;
        totalCases += 1;
        if (typeof item.id !== "string" || !/^[A-Z]+-[PNAIS]\d{2}$/.test(item.id)) {
            errors.push(`${label}.id deve seguir PREFIXO-CATEGORIA00`);
        }
        requireText(item.prompt, `${label}.prompt`);
        requireText(item.fixture, `${label}.fixture`);

        if (ids.has(item.id)) errors.push(`${label}: id duplicado ${item.id}`);
        ids.add(item.id);
        if (!validCategories.has(item.category)) {
            errors.push(`${label}: category inválida`);
        } else {
            counts[item.category] += 1;
        }

        if (!item.expected || !validOutcomes.has(item.expected.outcome)) {
            errors.push(`${label}: expected.outcome inválido`);
            continue;
        }
        if (!Array.isArray(item.expected.invariants)) {
            errors.push(`${label}: expected.invariants deve ser array`);
        }
        if (!Array.isArray(item.expected.must_cover) || item.expected.must_cover.length === 0) {
            errors.push(`${label}: expected.must_cover vazio`);
        }
        if (!Array.isArray(item.expected.must_not)) {
            errors.push(`${label}: expected.must_not deve ser array`);
        }
        if (
            item.expected.outcome === "finding" &&
            (!Array.isArray(item.expected.severity) ||
                !item.expected.severity.every((value) => validSeverities.has(value)))
        ) {
            errors.push(`${label}: finding sem severidade válida`);
        }
        if (item.category === "positive" && item.expected.outcome !== "finding") {
            errors.push(`${label}: caso positivo deve esperar finding`);
        }
        if (item.category === "negative" && item.expected.outcome !== "no_finding") {
            errors.push(`${label}: caso negativo deve esperar no_finding`);
        }

        const serialized = JSON.stringify(item);
        if (serialized.includes("{{") || /\bTODO\s*[:(\[]/i.test(serialized)) {
            errors.push(`${label}: contém placeholder não resolvido`);
        }
    }

    for (const [category, minimum] of Object.entries(registry.minimum_categories)) {
        if (counts[category] < minimum) {
            errors.push(`${skill}: ${category} possui ${counts[category]}, mínimo ${minimum}`);
        }
    }

    const summary = Object.entries(counts)
        .map(([name, count]) => `${name}=${count}`)
        .join(", ");
    process.stdout.write(`${skill}: ${manifest.cases.length} casos (${summary})\n`);
}

if (errors.length > 0) {
    process.stderr.write(`\nCorpus inválido (${errors.length} erro(s)):\n`);
    for (const error of errors) process.stderr.write(`- ${error}\n`);
    process.exitCode = 1;
} else {
    process.stdout.write(
        `\nCorpus válido: ${totalCases} casos em ${registry.skills.length} skills.\n`,
    );
}
