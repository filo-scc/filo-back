import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = resolve(repositoryRoot, ".agents/skills");
const targetRoot = resolve(repositoryRoot, ".claude/skills");
const checkOnly = process.argv.includes("--check");

// Arquivos específicos do Codex que não fazem sentido no Claude Code.
const codexOnly = new Set(["agents/openai.yaml"]);
const textExtensions = new Set([".md", ".yaml", ".yml", ".json", ".mjs", ".html"]);

function listFiles(directory) {
    return readdirSync(directory)
        .flatMap((entry) => {
            const absolutePath = resolve(directory, entry);
            return statSync(absolutePath).isDirectory() ? listFiles(absolutePath) : [absolutePath];
        })
        .sort();
}

const skillNames = readdirSync(sourceRoot).filter((entry) => statSync(resolve(sourceRoot, entry)).isDirectory());
const invocation = new RegExp(`\\$(${skillNames.join("|")})\\b`, "g");

function convert(relativePath, content, skillName) {
    let output = content;
    if (relativePath.endsWith(".md")) {
        // Codex invoca skills com $nome; o Claude Code usa /nome.
        output = output.replace(invocation, "/$1");
    }
    if (relativePath === "SKILL.md") {
        const marker = `<!-- Gerado por .agents/skill-standard/sync-claude-skills.mjs a partir de .agents/skills/${skillName}. Não edite aqui: altere a fonte e execute o script. -->`;
        output = output.replace(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/, `$1\n${marker}\n`);
    }
    return output;
}

const expected = new Map();
for (const skillName of skillNames) {
    const skillDirectory = resolve(sourceRoot, skillName);
    for (const file of listFiles(skillDirectory)) {
        const relativePath = relative(skillDirectory, file).split("\\").join("/");
        if (codexOnly.has(relativePath)) continue;
        const extension = relativePath.slice(relativePath.lastIndexOf("."));
        const target = resolve(targetRoot, skillName, relativePath);
        const raw = readFileSync(file);
        expected.set(target, textExtensions.has(extension) ? Buffer.from(convert(relativePath, raw.toString("utf8"), skillName), "utf8") : raw);
    }
}

const stale = existsSync(targetRoot) ? listFiles(targetRoot).filter((file) => !expected.has(file)) : [];
const outdated = [...expected].filter(([target, content]) => !existsSync(target) || !readFileSync(target).equals(content)).map(([target]) => target);

if (checkOnly) {
    const problems = [...outdated.map((file) => `desatualizado ou ausente: ${relative(repositoryRoot, file)}`), ...stale.map((file) => `órfão: ${relative(repositoryRoot, file)}`)];
    if (problems.length > 0) {
        console.error(`.claude/skills fora de sincronia com .agents/skills:\n- ${problems.join("\n- ")}\nExecute: node .agents/skill-standard/sync-claude-skills.mjs`);
        process.exit(1);
    }
    console.log(`.claude/skills sincronizado com .agents/skills (${skillNames.length} skills, ${expected.size} arquivos).`);
} else {
    for (const file of stale) rmSync(file);
    for (const [target, content] of expected) {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, content);
    }
    console.log(`.claude/skills gerado a partir de .agents/skills (${skillNames.length} skills, ${expected.size} arquivos, ${outdated.length} alterados, ${stale.length} removidos).`);
}
