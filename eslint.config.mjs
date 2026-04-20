import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default [
    // 1. Defina o que ignorar globalmente primeiro
    {
        ignores: [
            "**/node_modules/**",
            "**/dist/**",
            "**/coverage/**",
            "**/generated/**",
            "**/.prisma/**",
            "**/prisma/migrations/**",
            "nest-cli.json",
            "tsconfig.json",
            "tsconfig.build.json",
            "package.json",
            "pnpm-lock.yaml",
            "**/*.md",
        ],
    },

    js.configs.recommended,

    ...tseslint.configs.recommended,

    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                sourceType: "module",
                ecmaVersion: 2022,
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": "warn",
            "no-console": "off",
        },
    },

    prettier,
];