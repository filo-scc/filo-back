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

function validateEvals(path, skillName) {
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
    }
}

function validateTriggerEvals(path, skillName) {
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
    if (!Array.isArray(data) || data.length < 10) {
        errors.push(`${skillName}: trigger evals deve possuir ao menos 10 consultas no piloto`);
        return;
    }
    for (const [index, item] of data.entries()) {
        requireText(item.query, `${skillName}.trigger-evals[${index}].query`);
        if (typeof item.should_trigger !== "boolean") {
            errors.push(`${skillName}.trigger-evals[${index}].should_trigger deve ser boolean`);
        }
    }
}

const manifests = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(skillsRoot, entry.name, "manifest.yaml")))
    .map((entry) => entry.name)
    .sort();
const availableSkills = new Set(
    readdirSync(skillsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
);

if (manifests.length === 0) errors.push("nenhum manifest.yaml encontrado");

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
    requireText(manifest.scope?.objective, `${skillName}.scope.objective`);
    requireList(manifest.scope?.non_objectives, `${skillName}.scope.non_objectives`);
    requireList(manifest.invocation?.triggers, `${skillName}.invocation.triggers`);
    requireList(manifest.invocation?.anti_triggers, `${skillName}.invocation.anti_triggers`);
    requireList(manifest.input?.parameters, `${skillName}.input.parameters`);
    requireList(manifest.input?.artifacts, `${skillName}.input.artifacts`, true);
    requireList(manifest.input?.preconditions, `${skillName}.input.preconditions`);
    requireList(manifest.output?.required_sections, `${skillName}.output.required_sections`);
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

    const behaviorPath = join(skillRoot, manifest.evaluation?.behavioral ?? "");
    const triggerPath = join(skillRoot, manifest.evaluation?.triggers ?? "");
    validateEvals(behaviorPath, skillName);
    validateTriggerEvals(triggerPath, skillName);
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
