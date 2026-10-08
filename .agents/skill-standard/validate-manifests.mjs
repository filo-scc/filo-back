import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const standardRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(standardRoot, "../..");
const skillsRoot = join(repoRoot, ".agents", "skills");
const schema = JSON.parse(readFileSync(join(standardRoot, "manifest.schema.json"), "utf8"));
const workflowCatalog = yaml.load(readFileSync(join(standardRoot, "workflows.yaml"), "utf8"));
const errors = [];

function requireObject(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        errors.push(`${label} deve ser objeto`);
        return false;
    }
    return true;
}

function requireText(value, label) {
    if (typeof value !== "string" || value.trim().length < 2) {
        errors.push(`${label} deve ser texto`);
    }
}

function requireList(value, label, allowEmpty = false) {
    if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
        errors.push(`${label} deve ser lista${allowEmpty ? "" : " não vazia"}`);
        return false;
    }
    return true;
}

function checkResourcePaths(skillRoot, values, label) {
    if (!Array.isArray(values)) return;
    for (const path of values) {
        if (typeof path !== "string" || !existsSync(join(skillRoot, path))) {
            errors.push(`${label}: recurso ausente ${path}`);
        }
    }
}

const evalCategories = [
    "positive",
    "negative",
    "adversarial",
    "prompt_injection",
    "insufficient_evidence",
];

function validateEvals(path, skillName, minimumCategories = {}) {
    if (!existsSync(path)) {
        errors.push(`${skillName}: evals ausentes em ${path}`);
        return;
    }
    let data;
    try {
        data = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
        errors.push(`${skillName}: evals inválidos (${error.message})`);
        return;
    }
    if (data.skill_name !== skillName) errors.push(`${skillName}: skill_name divergente nos evals`);
    if (!Array.isArray(data.evals) || data.evals.length === 0) {
        errors.push(`${skillName}: evals deve ser lista não vazia`);
        return;
    }
    const ids = new Set();
    const categoryCounts = Object.fromEntries(evalCategories.map((category) => [category, 0]));
    for (const [index, item] of data.evals.entries()) {
        const label = `${skillName}.evals[${index}]`;
        if (!Number.isInteger(item.id) || ids.has(item.id)) errors.push(`${label}.id inválido ou duplicado`);
        ids.add(item.id);
        requireText(item.prompt, `${label}.prompt`);
        requireText(item.expected_output, `${label}.expected_output`);
        requireList(item.files, `${label}.files`, true);
        requireList(item.expectations, `${label}.expectations`);
        requireText(item.case_id, `${label}.case_id`);
        requireText(item.category, `${label}.category`);
        if (!Object.hasOwn(categoryCounts, item.category)) {
            errors.push(`${label}.category inválida`);
        } else {
            categoryCounts[item.category] += 1;
        }
    }
    for (const category of evalCategories) {
        const minimum = minimumCategories?.[category];
        if (!Number.isInteger(minimum) || minimum < 0) {
            errors.push(`${skillName}.evaluation.minimum_categories.${category} inválido`);
        } else if (categoryCounts[category] < minimum) {
            errors.push(
                `${skillName}: ${category} possui ${categoryCounts[category]}, mínimo declarado ${minimum}`,
            );
        }
    }
}

function validateTriggerEvals(path, skillName, minimumCases) {
    if (!existsSync(path)) {
        errors.push(`${skillName}: trigger evals ausentes em ${path}`);
        return;
    }
    let data;
    try {
        data = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
        errors.push(`${skillName}: trigger evals inválidos (${error.message})`);
        return;
    }
    if (!Number.isInteger(minimumCases) || minimumCases < 1) {
        errors.push(`${skillName}.evaluation.minimum_trigger_cases inválido`);
        return;
    }
    if (!Array.isArray(data) || data.length < minimumCases) {
        errors.push(`${skillName}: trigger evals deve possuir ao menos ${minimumCases} consultas`);
        return;
    }
    for (const [index, item] of data.entries()) {
        requireText(item.query, `${skillName}.trigger-evals[${index}].query`);
        if (typeof item.should_trigger !== "boolean") {
            errors.push(`${skillName}.trigger-evals[${index}].should_trigger deve ser boolean`);
        }
    }
}

const skillDirectories = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
const manifests = skillDirectories.filter((name) =>
    existsSync(join(skillsRoot, name, "manifest.yaml")),
);
const availableSkills = new Set(skillDirectories);

if (manifests.length === 0) errors.push("nenhum manifest.yaml encontrado");
for (const skillName of skillDirectories.filter((name) => !manifests.includes(name))) {
    errors.push(`${skillName}: manifest.yaml ausente`);
}

for (const skillName of manifests) {
    const skillRoot = join(skillsRoot, skillName);
    let manifest;
    try {
        manifest = yaml.load(readFileSync(join(skillRoot, "manifest.yaml"), "utf8"));
    } catch (error) {
        errors.push(`${skillName}: manifest.yaml inválido (${error.message})`);
        continue;
    }

    if (!requireObject(manifest, skillName)) continue;
    if (manifest.schema_version !== "1.0") errors.push(`${skillName}: schema_version deve ser 1.0`);

    const unexpectedSections = Object.keys(manifest).filter(
        (section) => !Object.hasOwn(schema.properties, section),
    );
    if (unexpectedSections.length > 0) {
        errors.push(`${skillName}: seções inesperadas: ${unexpectedSections.join(", ")}`);
    }

    for (const section of schema.required.filter((name) => name !== "schema_version")) {
        requireObject(manifest[section], `${skillName}.${section}`);
    }

    if (manifest.identity?.name !== skillName) errors.push(`${skillName}: identity.name deve coincidir com a pasta`);
    requireText(manifest.identity?.display_name, `${skillName}.identity.display_name`);
    requireText(manifest.identity?.summary, `${skillName}.identity.summary`);
    requireText(manifest.governance?.owner, `${skillName}.governance.owner`);
    requireList(manifest.governance?.reviewers, `${skillName}.governance.reviewers`);
    requireList(manifest.scope?.repositories, `${skillName}.scope.repositories`);
    requireText(manifest.scope?.canonical_repository, `${skillName}.scope.canonical_repository`);
    if (!manifest.scope?.repositories?.includes(manifest.scope?.canonical_repository)) {
        errors.push(`${skillName}.scope.canonical_repository deve constar em repositories`);
    }
    requireText(manifest.scope?.objective, `${skillName}.scope.objective`);
    requireList(manifest.scope?.non_objectives, `${skillName}.scope.non_objectives`);
    requireList(manifest.invocation?.triggers, `${skillName}.invocation.triggers`);
    requireList(manifest.invocation?.anti_triggers, `${skillName}.invocation.anti_triggers`);
    requireList(manifest.input?.parameters, `${skillName}.input.parameters`);
    requireList(manifest.input?.artifacts, `${skillName}.input.artifacts`, true);
    requireList(manifest.input?.preconditions, `${skillName}.input.preconditions`);
    requireList(manifest.output?.required_sections, `${skillName}.output.required_sections`);
    requireList(manifest.output?.limitations, `${skillName}.output.limitations`);
    requireList(manifest.output?.prohibited_claims, `${skillName}.output.prohibited_claims`);
    requireList(manifest.workflow?.required_steps, `${skillName}.workflow.required_steps`);
    requireList(manifest.permissions?.tools, `${skillName}.permissions.tools`);
    requireList(manifest.resources?.references, `${skillName}.resources.references`, true);
    requireList(manifest.resources?.scripts, `${skillName}.resources.scripts`, true);
    requireList(manifest.resources?.assets, `${skillName}.resources.assets`, true);

    checkResourcePaths(skillRoot, manifest.resources?.references, `${skillName}.resources.references`);
    checkResourcePaths(skillRoot, manifest.resources?.scripts, `${skillName}.resources.scripts`);
    checkResourcePaths(skillRoot, manifest.resources?.assets, `${skillName}.resources.assets`);

    const lifecycleValues = schema.properties.governance.properties.lifecycle_status.enum;
    if (!lifecycleValues.includes(manifest.governance?.lifecycle_status)) {
        errors.push(`${skillName}.governance.lifecycle_status inválido`);
    }
    const invocationModes = schema.properties.invocation.properties.mode.enum;
    if (!invocationModes.includes(manifest.invocation?.mode)) {
        errors.push(`${skillName}.invocation.mode inválido`);
    }
    const inputModes = schema.properties.input.properties.mode.enum;
    if (!inputModes.includes(manifest.input?.mode)) {
        errors.push(`${skillName}.input.mode inválido`);
    }
    for (const [index, parameter] of (manifest.input?.parameters ?? []).entries()) {
        requireText(parameter?.name, `${skillName}.input.parameters[${index}].name`);
        requireText(parameter?.type, `${skillName}.input.parameters[${index}].type`);
        requireText(parameter?.description, `${skillName}.input.parameters[${index}].description`);
        requireText(parameter?.origin, `${skillName}.input.parameters[${index}].origin`);
        requireText(parameter?.validation, `${skillName}.input.parameters[${index}].validation`);
        if (!Object.hasOwn(parameter ?? {}, "default")) {
            errors.push(`${skillName}.input.parameters[${index}].default ausente`);
        }
        if (!Object.hasOwn(parameter ?? {}, "example")) {
            errors.push(`${skillName}.input.parameters[${index}].example ausente`);
        }
        if (typeof parameter?.required !== "boolean") {
            errors.push(`${skillName}.input.parameters[${index}].required deve ser boolean`);
        }
    }
    const permissionAccess = schema.properties.permissions.properties.tools.items.properties.access.enum;
    const enforcementValues =
        schema.properties.permissions.properties.tools.items.properties.enforcement.enum;
    for (const [index, tool] of (manifest.permissions?.tools ?? []).entries()) {
        requireText(tool?.name, `${skillName}.permissions.tools[${index}].name`);
        if (!permissionAccess.includes(tool?.access)) {
            errors.push(`${skillName}.permissions.tools[${index}].access inválido`);
        }
        if (!enforcementValues.includes(tool?.enforcement)) {
            errors.push(`${skillName}.permissions.tools[${index}].enforcement inválido`);
        }
    }

    const skillPath = join(skillRoot, "SKILL.md");
    if (!existsSync(skillPath)) {
        errors.push(`${skillName}: SKILL.md ausente`);
    } else {
        const skillContent = readFileSync(skillPath, "utf8");
        const frontmatterMatch = skillContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!frontmatterMatch) {
            errors.push(`${skillName}: frontmatter ausente no SKILL.md`);
        } else {
            const frontmatter = yaml.load(frontmatterMatch[1]);
            if (frontmatter?.name !== skillName) errors.push(`${skillName}: name divergente no SKILL.md`);
            requireText(frontmatter?.description, `${skillName}.SKILL.description`);
        }
        for (const reference of manifest.resources?.references ?? []) {
            if (!skillContent.includes(reference)) {
                errors.push(`${skillName}: referência não roteada pelo SKILL.md: ${reference}`);
            }
        }
    }

    const metadataPath = join(skillRoot, "agents", "openai.yaml");
    if (existsSync(metadataPath)) {
        const metadata = yaml.load(readFileSync(metadataPath, "utf8"));
        const implicitExpected = manifest.invocation?.mode !== "explicit";
        if (metadata?.policy?.allow_implicit_invocation !== implicitExpected) {
            errors.push(`${skillName}: invocation.mode diverge de agents/openai.yaml`);
        }
    }

    const behaviorPath = join(skillRoot, manifest.evaluation?.behavioral ?? "");
    const triggerPath = join(skillRoot, manifest.evaluation?.triggers ?? "");
    validateEvals(behaviorPath, skillName, manifest.evaluation?.minimum_categories);
    validateTriggerEvals(triggerPath, skillName, manifest.evaluation?.minimum_trigger_cases);
    if (
        manifest.evaluation?.legacy_source &&
        !existsSync(join(skillRoot, manifest.evaluation.legacy_source))
    ) {
        errors.push(`${skillName}: legacy_source ausente`);
    }

    for (const type of ["positive", "negative", "output"]) {
        requireText(manifest.examples?.[type], `${skillName}.examples.${type}`);
    }

    process.stdout.write(`${skillName}: manifesto válido\n`);
}

if (!Array.isArray(workflowCatalog?.workflows) || workflowCatalog.workflows.length === 0) {
    errors.push("workflows.yaml deve possuir uma lista não vazia de workflows");
} else {
    const workflowIds = new Set();
    const validStepTypes = new Set(["action", "skill", "decision", "human"]);
    for (const [workflowIndex, workflow] of workflowCatalog.workflows.entries()) {
        const label = `workflows[${workflowIndex}]`;
        requireText(workflow.id, `${label}.id`);
        requireText(workflow.title, `${label}.title`);
        requireText(workflow.description, `${label}.description`);
        if (workflowIds.has(workflow.id)) errors.push(`${label}.id duplicado`);
        workflowIds.add(workflow.id);
        if (!requireList(workflow.steps, `${label}.steps`)) continue;
        for (const [stepIndex, step] of workflow.steps.entries()) {
            const stepLabel = `${label}.steps[${stepIndex}]`;
            if (!validStepTypes.has(step.type)) errors.push(`${stepLabel}.type inválido`);
            requireText(step.label, `${stepLabel}.label`);
            requireText(step.detail, `${stepLabel}.detail`);
            const referencedSkills = step.skills ?? (step.skill ? [step.skill] : []);
            for (const skillName of referencedSkills) {
                if (!availableSkills.has(skillName)) {
                    errors.push(`${stepLabel}: skill ausente ${skillName}`);
                }
            }
        }
    }
    process.stdout.write(`${workflowCatalog.workflows.length} fluxo(s) integrado(s) válido(s)\n`);
}

if (errors.length > 0) {
    process.stderr.write(`\nManifestos inválidos (${errors.length} erro(s)):\n`);
    for (const error of errors) process.stderr.write(`- ${error}\n`);
    process.exitCode = 1;
} else {
    process.stdout.write(`\n${manifests.length} manifesto(s) válido(s).\n`);
}
