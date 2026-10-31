import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const args = process.argv.slice(2);
const templateMode = args.includes("--template");
const fileArg = args.find((arg) => arg !== "--template");

if (!fileArg) {
    console.error("Uso: node validate-email-html.mjs <arquivo.html> [--template]");
    process.exit(2);
}

const file = resolve(fileArg);
if (extname(file).toLowerCase() !== ".html") {
    console.error("O arquivo precisa usar a extensão .html.");
    process.exit(2);
}

let html;
try {
    html = readFileSync(file, "utf8");
} catch (error) {
    console.error(`Não foi possível ler ${file}: ${error.message}`);
    process.exit(2);
}

const errors = [];
const requirePattern = (pattern, message) => {
    if (!pattern.test(html)) errors.push(message);
};

requirePattern(/<!doctype html>/i, "doctype HTML ausente");
requirePattern(/<html\b[^>]*\blang=["']pt-BR["']/i, 'lang="pt-BR" ausente');
requirePattern(/<meta\b[^>]*charset=["']?UTF-8/i, "charset UTF-8 ausente");
requirePattern(/<meta\b[^>]*name=["']viewport["']/i, "meta viewport ausente");
requirePattern(/<title>[^<]+<\/title>/i, "title vazio ou ausente");
requirePattern(/data-preheader=["']true["']/i, "preheader oculto não identificado");
requirePattern(/<table\b[^>]*role=["']presentation["']/i, 'layout sem table role="presentation"');
requirePattern(/max-width:\s*720px/i, "largura máxima de 720 px ausente");
requirePattern(/<a\b[^>]*href=/i, "CTA ou link navegável ausente");
requirePattern(/<!--\s*Subject:\s*.+?-->/i, "comentário Subject ausente");
requirePattern(/<!--\s*Preheader:\s*.+?-->/i, "comentário Preheader ausente");
requirePattern(/<!--\s*Release status:\s*(?:draft|scheduled|released|{{[^}]+}})\s*-->/i, "comentário Release status ausente ou inválido");
requirePattern(/<!--\s*Sources:\s*.+?-->/i, "comentário Sources ausente");

const forbiddenElements = ["script", "form", "iframe", "object", "embed", "video", "audio", "canvas"];
for (const element of forbiddenElements) {
    if (new RegExp(`<${element}\\b`, "i").test(html)) {
        errors.push(`elemento proibido: <${element}>`);
    }
}

if (/\son[a-z]+\s*=/i.test(html)) errors.push("atributo de evento JavaScript encontrado");
if (/javascript\s*:/i.test(html)) errors.push("URL javascript: encontrada");
if (/\b(?:src|href)=["'](?:data|blob|file):/i.test(html)) {
    errors.push("URL data:, blob: ou file: encontrada");
}

if (!templateMode && /{{[^}]+}}/.test(html)) errors.push("marcador de template não substituído");

for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\balt=["'][^"']*["']/i.test(tag)) errors.push("imagem sem atributo alt");
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (src && !/^https:\/\//i.test(src) && !(templateMode && /{{[^}]+}}/.test(src))) {
        errors.push(`imagem sem URL HTTPS: ${src}`);
    }
}

for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    const href = match[1];
    const allowed = /^https:\/\//i.test(href) || /^mailto:/i.test(href);
    if (!allowed && !(templateMode && /{{[^}]+}}/.test(href))) {
        errors.push(`link não permitido: ${href}`);
    }
}

if (errors.length) {
    console.error(`Email HTML inválido (${errors.length} erro(s)):`);
    for (const error of [...new Set(errors)]) console.error(`- ${error}`);
    process.exit(1);
}

console.log(`Email HTML válido: ${file}${templateMode ? " (template)" : ""}`);
