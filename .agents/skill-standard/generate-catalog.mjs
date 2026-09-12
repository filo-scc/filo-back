import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const standardRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(standardRoot, "../..");
const skillsRoot = join(repoRoot, ".agents", "skills");
const outputPath = resolve(process.argv[2] ?? "/tmp/opencode/filo-skills-catalog.html");
const workflowCatalog = yaml.load(readFileSync(join(standardRoot, "workflows.yaml"), "utf8"));

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function list(values) {
    if (!Array.isArray(values) || values.length === 0) return '<p class="empty">Nenhum item declarado.</p>';
    return `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function parameters(values) {
    if (!Array.isArray(values) || values.length === 0) return '<p class="empty">Nenhum parâmetro declarado.</p>';
    return `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Obrigatório</th><th>Descrição</th></tr></thead><tbody>${values
        .map(
            (item) =>
                `<tr><td><code>${escapeHtml(item.name)}</code></td><td>${escapeHtml(item.type)}</td><td>${item.required ? "Sim" : "Não"}</td><td>${escapeHtml(item.description)}</td></tr>`,
        )
        .join("")}</tbody></table></div>`;
}

function permissions(values) {
    return `<div class="chips">${(values ?? [])
        .map(
            (item) =>
                `<span class="chip ${escapeHtml(item.access)}"><strong>${escapeHtml(item.name)}</strong> ${escapeHtml(item.access)} · ${escapeHtml(item.enforcement)}</span>`,
        )
        .join("")}</div>`;
}

const skills = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
        const path = join(skillsRoot, entry.name, "manifest.yaml");
        try {
            return [{ ...yaml.load(readFileSync(path, "utf8")), path }];
        } catch {
            return [];
        }
    })
    .sort((a, b) => a.identity.name.localeCompare(b.identity.name));
const documentedSkillNames = new Set(skills.map((skill) => skill.identity.name));

const cards = skills
    .map(
        (skill) => `
        <article class="skill" id="${escapeHtml(skill.identity.name)}">
            <header>
                <div>
                    <p class="eyebrow">${escapeHtml(skill.governance.lifecycle_status)}</p>
                    <h2>${escapeHtml(skill.identity.display_name)}</h2>
                    <p class="summary">${escapeHtml(skill.identity.summary)}</p>
                </div>
                <code>${escapeHtml(skill.identity.name)}</code>
            </header>

            <section class="flow">
                <div><span>1</span><strong>Entrada</strong><small>${escapeHtml(skill.input.mode)}</small></div>
                <div><span>2</span><strong>Análise</strong><small>${skill.workflow.required_steps.length} passos obrigatórios</small></div>
                <div><span>3</span><strong>Saída</strong><small>${escapeHtml(skill.output.format)}</small></div>
                <div><span>4</span><strong>Revisão</strong><small>humana e comparativa</small></div>
            </section>

            <div class="grid">
                <section><h3>Objetivo</h3><p>${escapeHtml(skill.scope.objective)}</p><h4>Não objetivos</h4>${list(skill.scope.non_objectives)}</section>
                <section><h3>Cenários de uso</h3><h4>Acionar</h4>${list(skill.invocation.triggers)}<h4>Não acionar</h4>${list(skill.invocation.anti_triggers)}</section>
            </div>

            <section><h3>Contrato de entrada</h3>${parameters(skill.input.parameters)}<h4>Precondições</h4>${list(skill.input.preconditions)}</section>
            <section><h3>Contrato de saída</h3><p><strong>Formato:</strong> ${escapeHtml(skill.output.format)}</p>${list(skill.output.required_sections)}<p><strong>Sem findings:</strong> ${escapeHtml(skill.output.no_findings)}</p><p><strong>Evidência insuficiente:</strong> ${escapeHtml(skill.output.insufficient_evidence)}</p></section>

            <div class="grid">
                <section><h3>Fluxo obrigatório</h3>${list(skill.workflow.required_steps)}<p><strong>Espaço para adaptação:</strong> ${escapeHtml(skill.workflow.improvisation)}</p></section>
                <section><h3>Permissões</h3>${permissions(skill.permissions.tools)}<p><strong>Rede:</strong> ${escapeHtml(skill.permissions.network)} · <strong>Escrita externa:</strong> ${escapeHtml(skill.permissions.external_write)}</p><h4>Bash</h4>${list(skill.permissions.bash)}</section>
            </div>

            <div class="grid">
                <section><h3>Composição</h3><h4>Complementa</h4>${list(skill.composition.complements)}<h4>Não substitui</h4>${list(skill.composition.does_not_replace)}</section>
                <section><h3>Recursos e evals</h3><h4>References</h4>${list(skill.resources.references)}<h4>Scripts</h4>${list(skill.resources.scripts)}<h4>Assets</h4>${list(skill.resources.assets)}<p><strong>Comportamento:</strong> <code>${escapeHtml(skill.evaluation.behavioral)}</code></p><p><strong>Gatilhos:</strong> <code>${escapeHtml(skill.evaluation.triggers)}</code></p></section>
            </div>

            <section><h3>Exemplos</h3><p><strong>Positivo:</strong> ${escapeHtml(skill.examples.positive)}</p><p><strong>Negativo:</strong> ${escapeHtml(skill.examples.negative)}</p><pre>${escapeHtml(skill.examples.output)}</pre></section>
            <footer>Owner: ${escapeHtml(skill.governance.owner)} · Próxima revisão: ${escapeHtml(skill.governance.next_review)} · Repositórios: ${escapeHtml(skill.scope.repositories.join(", "))}</footer>
        </article>`,
    )
    .join("");

const navigation = skills
    .map((skill) => `<a href="#${escapeHtml(skill.identity.name)}">${escapeHtml(skill.identity.display_name)}</a>`)
    .join("");

const workflows = (workflowCatalog.workflows ?? [])
    .map(
        (workflow) => `
        <article class="workflow-card" id="${escapeHtml(workflow.id)}">
            <header>
                <p class="eyebrow">Fluxo integrado</p>
                <h2>${escapeHtml(workflow.title)}</h2>
                <p class="summary">${escapeHtml(workflow.description)}</p>
            </header>
            <div class="workflow-track">
                ${workflow.steps
                    .map((step, index) => {
                        const skillNames = step.skills ?? (step.skill ? [step.skill] : []);
                        const linkedSkills = skillNames
                            .map(
                                (skillName) =>
                                    documentedSkillNames.has(skillName)
                                        ? `<a class="skill-link" href="#${escapeHtml(skillName)}">${escapeHtml(skillName)}</a>`
                                        : `<span class="skill-link pending" title="Manifesto pendente">${escapeHtml(skillName)}</span>`,
                            )
                            .join("");
                        return `${index > 0 ? '<span class="arrow" aria-hidden="true">→</span>' : ""}
                            <section class="workflow-step ${escapeHtml(step.type)}">
                                <span class="step-kind">${escapeHtml(step.type)}</span>
                                <strong>${escapeHtml(step.label)}</strong>
                                ${linkedSkills ? `<div class="skill-links">${linkedSkills}</div>` : ""}
                                <small>${escapeHtml(step.detail)}</small>
                            </section>`;
                    })
                    .join("")}
            </div>
        </article>`,
    )
    .join("");

const workflowNavigation = (workflowCatalog.workflows ?? [])
    .map((workflow) => `<a href="#${escapeHtml(workflow.id)}">${escapeHtml(workflow.title)}</a>`)
    .join("");

const html = `<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Catálogo de skills FILO</title>
    <style>
        :root { --ink:#17201d; --muted:#68736e; --paper:#f4f0e7; --card:#fffdf7; --line:#d8d1c3; --accent:#176b58; --warn:#a4512a; }
        * { box-sizing:border-box; }
        body { margin:0; color:var(--ink); background:var(--paper); font:16px/1.55 Georgia, "Times New Roman", serif; }
        .masthead { padding:56px max(24px, calc((100vw - 1120px)/2)); color:#f7f2e8; background:var(--ink); border-bottom:7px solid var(--accent); }
        .masthead p { max-width:760px; color:#c9d1cd; }
        h1 { margin:0; font-size:clamp(2.5rem, 7vw, 5.5rem); line-height:.92; letter-spacing:-.05em; }
        nav { position:sticky; top:0; z-index:2; display:flex; gap:8px; padding:12px max(20px, calc((100vw - 1120px)/2)); overflow:auto; background:rgba(244,240,231,.96); border-bottom:1px solid var(--line); backdrop-filter:blur(10px); }
        nav a { flex:0 0 auto; color:var(--ink); text-decoration:none; padding:7px 11px; border:1px solid var(--line); border-radius:99px; font:12px/1.2 system-ui,sans-serif; }
        main { width:min(1120px, calc(100% - 32px)); margin:36px auto 80px; }
        .skill { margin:0 0 44px; padding:clamp(20px,4vw,44px); background:var(--card); border:1px solid var(--line); box-shadow:0 16px 44px rgba(36,31,22,.08); }
        .workflow-card { margin:0 0 32px; padding:clamp(20px,4vw,36px); background:#e9efe9; border:1px solid #bdc9c1; }
        .workflow-card h2 { font-size:clamp(1.8rem,4vw,3rem); }
        .workflow-track { display:flex; align-items:stretch; gap:10px; margin-top:24px; overflow-x:auto; padding:4px 2px 14px; }
        .workflow-step { flex:1 0 190px; display:flex; flex-direction:column; gap:8px; min-height:190px; padding:16px; background:var(--card); border:1px solid var(--line); border-top:5px solid var(--accent); }
        .workflow-step.skill { border-top-color:#315c99; }
        .workflow-step.decision { border-top-color:#b57821; }
        .workflow-step.human { border-top-color:#8a3f64; }
        .workflow-step strong { font:700 1rem/1.25 system-ui,sans-serif; }
        .workflow-step small { color:var(--muted); }
        .step-kind { color:var(--muted); font:700 .68rem/1 system-ui,sans-serif; text-transform:uppercase; letter-spacing:.12em; }
        .arrow { align-self:center; color:var(--accent); font:700 1.7rem/1 system-ui,sans-serif; }
        .skill-links { display:flex; flex-wrap:wrap; gap:5px; }
        .skill-link { color:#264f82; background:#e5edf8; padding:4px 6px; border-radius:3px; text-decoration:none; font:11px/1.25 "SFMono-Regular",Consolas,monospace; }
        .skill-link.pending { color:#6e6250; background:#eee8dc; border:1px dashed #b7aa95; }
        .skill > header { display:flex; justify-content:space-between; gap:24px; padding-bottom:24px; border-bottom:1px solid var(--line); }
        h2 { margin:0; font-size:clamp(2rem,5vw,3.8rem); line-height:1; letter-spacing:-.04em; }
        h3 { margin:28px 0 12px; font:700 1rem/1.2 system-ui,sans-serif; letter-spacing:.08em; text-transform:uppercase; color:var(--accent); }
        h4 { margin:18px 0 6px; font:700 .82rem/1.2 system-ui,sans-serif; text-transform:uppercase; }
        .eyebrow { color:var(--warn); font:700 .75rem/1 system-ui,sans-serif; text-transform:uppercase; letter-spacing:.15em; }
        .summary { max-width:720px; color:var(--muted); font-size:1.15rem; }
        code, pre { font-family:"SFMono-Regular",Consolas,monospace; }
        pre { overflow:auto; padding:16px; color:#ecf3ef; background:#1e2925; border-radius:4px; }
        .flow { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; margin:28px 0; background:var(--line); border:1px solid var(--line); }
        .flow div { display:grid; gap:3px; padding:15px; background:var(--card); }
        .flow span { width:25px; height:25px; display:grid; place-items:center; color:white; background:var(--accent); border-radius:50%; font:700 12px system-ui,sans-serif; }
        .flow small { color:var(--muted); }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:32px; }
        ul { padding-left:20px; }
        li { margin:5px 0; }
        .table-wrap { overflow:auto; }
        table { width:100%; border-collapse:collapse; }
        th,td { padding:10px; text-align:left; border-bottom:1px solid var(--line); }
        th { font:700 .75rem system-ui,sans-serif; text-transform:uppercase; }
        .chips { display:flex; flex-wrap:wrap; gap:7px; }
        .chip { padding:6px 9px; background:#e8ece8; border-radius:3px; font:12px system-ui,sans-serif; }
        .chip.deny { background:#f2dfd7; }
        .chip.ask { background:#eee5ca; }
        .empty, footer { color:var(--muted); }
        footer { margin-top:32px; padding-top:18px; border-top:1px solid var(--line); font:12px system-ui,sans-serif; }
        @media (max-width:720px) { .grid,.flow { grid-template-columns:1fr; } .skill > header { display:block; } .skill > header > code { display:inline-block; margin-top:12px; } .workflow-track { flex-direction:column; overflow:visible; } .workflow-step { flex-basis:auto; min-height:0; } .arrow { transform:rotate(90deg); } }
    </style>
</head>
<body>
    <header class="masthead"><p class="eyebrow">Governança de IA · FILO</p><h1>Catálogo de skills</h1><p>Visão gerada dos contratos, fluxos, permissões, exemplos e relações entre skills. A fonte de verdade permanece nos manifestos e documentos de governança.</p></header>
    <nav><a href="#integrated-workflows">Fluxos</a>${workflowNavigation}${navigation}</nav>
    <main><section id="integrated-workflows"><p class="eyebrow">Orquestração</p><h2>Fluxos de trabalho esperados</h2><p class="summary">Cada caixa representa uma ação, decisão, uso de skill ou validação humana. As setas mostram a sequência recomendada; somente as skills aplicáveis ao risco devem ser acionadas.</p>${workflows}</section>${cards || '<p>Nenhum manifesto encontrado.</p>'}</main>
</body>
</html>`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html);
process.stdout.write(`${skills.length} skill(s) documentada(s) em ${outputPath}\n`);
