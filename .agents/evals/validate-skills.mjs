import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const evalRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(evalRoot, "..", "..");
const registry = JSON.parse(readFileSync(join(evalRoot, "registry.json"), "utf8"));
const allowedFrontmatter = new Set(["name", "description", "license", "allowed-tools", "metadata"]);
const errors = [];

for (const skill of registry.skills) {
    const skillRoot = join(repoRoot, ".agents", "skills", skill);
    const skillPath = join(skillRoot, "SKILL.md");
    const protocolPaths = [
        join(skillRoot, "references", "protocol.md"),
        join(skillRoot, "references", "review-protocol.md"),
    ];
    const metadataPath = join(skillRoot, "agents", "openai.yaml");
    const evalPath = join(evalRoot, skill, "cases.json");

    for (const path of [skillPath, metadataPath, evalPath]) {
        if (!existsSync(path)) errors.push(`${skill}: arquivo obrigatório ausente: ${path}`);
    }
    if (!protocolPaths.some((path) => existsSync(path))) {
        errors.push(`${skill}: referência de protocolo ausente`);
    }
    if (!existsSync(skillPath) || !existsSync(metadataPath)) continue;

    const content = readFileSync(skillPath, "utf8");
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
        errors.push(`${skill}: frontmatter ausente ou inválido`);
        continue;
    }

    let frontmatter;
    let metadata;
    try {
        frontmatter = yaml.load(match[1]);
        metadata = yaml.load(readFileSync(metadataPath, "utf8"));
    } catch (error) {
        errors.push(`${skill}: YAML inválido (${error.message})`);
        continue;
    }

    const unexpected = Object.keys(frontmatter).filter((key) => !allowedFrontmatter.has(key));
    if (unexpected.length)
        errors.push(`${skill}: frontmatter inesperado: ${unexpected.join(", ")}`);
    if (frontmatter.name !== skill) errors.push(`${skill}: name deve coincidir com a pasta`);
    if (!/^[a-z0-9-]+$/.test(frontmatter.name) || frontmatter.name.length > 64) {
        errors.push(`${skill}: name inválido`);
    }
    if (typeof frontmatter.description !== "string" || frontmatter.description.length > 1024) {
        errors.push(`${skill}: description inválida`);
    }
    if (frontmatter.description.includes("<") || frontmatter.description.includes(">")) {
        errors.push(`${skill}: description contém angle bracket`);
    }
    if (/^\s*\[TODO:/m.test(content)) errors.push(`${skill}: placeholder TODO no SKILL.md`);

    const defaultPrompt = metadata?.interface?.default_prompt;
    const shortDescription = metadata?.interface?.short_description;
    if (typeof metadata?.interface?.display_name !== "string") {
        errors.push(`${skill}: display_name ausente`);
    }
    if (
        typeof shortDescription !== "string" ||
        shortDescription.length < 25 ||
        shortDescription.length > 64
    ) {
        errors.push(`${skill}: short_description deve ter 25–64 caracteres`);
    }
    if (typeof defaultPrompt !== "string" || !defaultPrompt.includes(`$${skill}`)) {
        errors.push(`${skill}: default_prompt deve mencionar $${skill}`);
    }
    const expectedImplicitInvocation = !registry.explicit_only?.includes(skill);
    if (metadata?.policy?.allow_implicit_invocation !== expectedImplicitInvocation) {
        errors.push(`${skill}: policy.allow_implicit_invocation divergente do registry`);
    }

    process.stdout.write(`${skill}: estrutura válida\n`);
}

if (errors.length) {
    process.stderr.write(`\nSkills inválidas (${errors.length} erro(s)):\n`);
    for (const error of errors) process.stderr.write(`- ${error}\n`);
    process.exitCode = 1;
} else {
    process.stdout.write(`\n${registry.skills.length} skills válidas.\n`);
}
