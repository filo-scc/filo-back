# Filo Backend

O **Filo Backend** é o motor central do projeto Filo, desenvolvido para gerenciar o fluxo de produção têxtil, desde a modelagem até a embalagem (Kanban), controle de clientes, facções e fichas técnicas.

## Tecnologias

- **Framework:** [NestJS](https://nestjs.com/) (v11+)
- **Linguagem:** TypeScript
- **ORM:** [Prisma](https://www.prisma.io/)
- **Banco de Dados:** PostgreSQL
- **Containerização:** Docker & Docker Compose
- **Autenticação:** JWT (Access & Refresh Tokens)


## Pré-requisitos

Antes de começar, você precisará ter instalado em sua máquina:
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) (**Recomendado**)
- Ou [Node.js](https://nodejs.org/) (v18+) e [pnpm](https://pnpm.io/) (para execução local)


## Quick Start (Docker)

Esta é a forma mais rápida de subir o ambiente completo (API + Banco de Dados).

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/filo-scc/filo-back.git
   cd filo-back
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   # Linux / macOS
   cp .env.example .env
   ```
   ```powershell
   # PowerShell
   Copy-Item .env.example .env
   ```

   Edite o `.env` e preencha a senha do banco e as chaves JWT:
   ```bash
   # Rode 2x — uma vez para cada chave JWT
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

   > O `DATABASE_URL` já vem configurado com `@db` como host. **Não mude para `localhost`** — dentro do Docker o banco é acessado pelo nome do serviço `db`.

3. **Suba o ambiente com Seed (primeira vez):**
   ```bash
   # Linux / macOS
   RUN_SEED=true docker compose up --build
   ```
   ```powershell
   # PowerShell
   $env:RUN_SEED="true"; docker compose up --build
   ```
   Ou pelo script do package.json:
   ```bash
   pnpm docker:seed
   ```
   > **Windows:** antes de usar scripts `pnpm docker:*` pela primeira vez, instale o `cross-env`:
   > ```bash
   > pnpm add -D cross-env
   > ```

4. **Uso diário:**
   ```bash
   docker compose up
   # ou
   pnpm docker:up
   ```


## Quando fazer rebuild e quando resetar o banco

### Mudanças no código TypeScript (controller, service, dto)
Hot-reload cuida sozinho — nenhuma ação necessária.

### Mudanças no `schema.prisma`
Sempre que o schema for alterado, o fluxo padrão é **resetar o banco e rebuildar**. Isso garante que as migrations sejam aplicadas de forma limpa e o Prisma Client seja regenerado corretamente.

```bash
pnpm docker:reset:seed
```

> Este comando apaga todos os dados do banco (`down -v`) e repopula via seed. É o fluxo esperado durante o desenvolvimento.

| Situação | Comando | Perde dados? |
|---|---|---|
| Mudança em `.ts` | Nenhum (hot-reload) | ❌ |
| Mudança no `schema.prisma` | `pnpm docker:reset:seed` | ✅ (repopula com seed) |
| Resetar banco sem seed | `pnpm docker:reset` | ✅ |
| Primeira vez subindo | `pnpm docker:seed` | — |


## Scripts disponíveis

Atalhos configurados no `package.json` para abstrair os comandos Docker mais comuns:

| Script | Descrição |
|---|---|
| `pnpm docker:up` | Sobe o ambiente |
| `pnpm docker:up:build` | Sobe com rebuild (sem resetar banco) |
| `pnpm docker:down` | Para e remove containers |
| `pnpm docker:reset` | Apaga banco e rebuilda (sem seed) |
| `pnpm docker:reset:seed` | Apaga banco, rebuilda e popula com seed |
| `pnpm docker:seed` | Sobe com seed (sem apagar banco) |
| `pnpm docker:logs` | Acompanha logs da API |
| `pnpm docker:migrate` | Cria nova migration dentro do container |
| `pnpm docker:studio` | Abre o Prisma Studio |


## Gerenciamento do Banco (Prisma)

- **Visualizar dados (Interface Gráfica):**
  ```bash
  pnpm docker:studio
  # Abre em http://localhost:5555
  ```

- **Criar nova migração:**
  ```bash
  pnpm docker:migrate
  ```

- **Resetar banco e repopular (fluxo padrão ao mudar schema):**
  ```bash
  pnpm docker:reset:seed
  ```


## Testes

```bash
# Unitários
pnpm run test

# E2E
pnpm run test:e2e

# Cobertura
pnpm run test:cov
```


## Estrutura do Projeto

- `src/`: Código fonte da aplicação NestJS.
- `prisma/`: Schema do banco de dados, migrações e scripts de seed.
- `docker/`: Scripts de inicialização e configuração de containers.
- `test/`: Testes de integração (E2E).


---

## Outros Pontos

- **CORS:** O backend está configurado por padrão para aceitar requisições do frontend em `http://localhost:5173`.
- **DATABASE_URL:** Dentro do Docker, o host do banco é sempre `db` (nome do serviço no compose), nunca `localhost`.
- **Massa de Dados:** O seed gera automaticamente fabricos, facções, clientes, usuários (Admin/Proprietário), grades, tamanhos e fluxos de Kanban completos para testes.
- **Segurança:** Nunca comite o arquivo `.env` com chaves reais. Use sempre o `.env.example` como base.


## IntelliSense e Erros do VS Code após mudança no Schema

Após alterar o `schema.prisma` e rodar o `pnpm docker:reset:seed`, a aplicação funciona corretamente no container, mas o VS Code pode continuar exibindo erros como:

```
Property 'fabricoGrade' does not exist on type 'PrismaClient'
Property 'tamanho' does not exist on type 'PrismaService'
```

**Isso não é um erro real.** O IntelliSense do VS Code usa o Prisma Client gerado localmente no host, que ainda está desatualizado. O container usa o client correto, por isso a aplicação roda normalmente.

### Solução

Regenere o Prisma Client no host:

```bash
pnpm exec prisma generate
```

Se os erros persistirem após alguns segundos, reinicie o servidor TypeScript do VS Code:

```
Ctrl+Shift+P → TypeScript: Restart TS Server
```

### Regra geral

Sempre que rodar `pnpm docker:reset:seed` ou qualquer comando que altere o schema, rode também `pnpm exec prisma generate` no terminal do host para manter o IntelliSense sincronizado.

Você pode criar um hábito com a sequência:

```bash
pnpm docker:reset:seed && pnpm exec prisma generate
```