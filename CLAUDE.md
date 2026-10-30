@AGENTS.md

# Claude Code

As regras operacionais do projeto estão no `AGENTS.md` (importado acima) e valem igualmente para o Claude Code e o Codex.

## Skills

- Fonte canônica: `.agents/skills/` (formato Codex, com `agents/openai.yaml`). Não edite `.claude/skills/` diretamente.
- `.claude/skills/` é a cópia no formato do Claude Code, gerada por script. Invoque com `/nome-da-skill` (no Codex, `$nome-da-skill`).
- Ao alterar uma skill em `.agents/skills/`, regenere a cópia e confira a sincronia:

```bash
node .agents/skill-standard/sync-claude-skills.mjs
node .agents/skill-standard/sync-claude-skills.mjs --check
```

Onde o `AGENTS.md` cita `$prisma-migration-review`, `$tenant-isolation-review` etc., leia como `/prisma-migration-review`, `/tenant-isolation-review` etc.
