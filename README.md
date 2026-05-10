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

   > O `DATABASE_URL` já vem configurado com `@db` como host. **Não mudar para `localhost`** dentro do Docker o banco é acessado pelo nome do serviço `db`.

3. **Suba o ambiente com Seed (primeira vez):**
   ```bash
   # Linux / macOS
   RUN_SEED=true docker compose up --build
   ```
   ```powershell
   # PowerShell
   $env:RUN_SEED="true"; docker compose up --build
   ```
   **Ou pelo script do package.json:**
   
   > **Windows:** antes de usar este script pela primeira vez, instale o `cross-env`:
   > ```bash
   > pnpm add -D cross-env
   > ```
   > Ele garante que a variável `RUN_SEED=true` seja injetada corretamente no PowerShell.
   
   ```bash
   pnpm docker:seed
   ```

4. **Uso diário:**
   ```bash
   docker compose up
   # ou
   pnpm docker:up
   ```


## Quando fazer rebuild (`--build`)

O rebuild reconstrói a imagem Docker do zero. Ele é necessário em situações específicas fora delas, o hot-reload cuida das mudanças automaticamente.

| Situação | Precisa de rebuild? |
|---|---|
| Alterar código `.ts` (controllers, services, etc.) | ❌ Hot-reload cuida |
| Alterar `.env` | ❌ Reinicie com `docker compose up` |
| Instalar nova dependência (`pnpm add X`) | ✅ |
| Alterar `package.json` ou `pnpm-lock.yaml` | ✅ |
| Alterar `schema.prisma` | ✅ (ver seção Migrations) |
| Alterar `Dockerfile` ou `docker-compose.yml` | ✅ |
| Primeira vez subindo | ✅ |

```bash
# Rebuild manual
docker compose up --build

# Ou pelo script
pnpm docker:up:build
```


## Fluxo de Migrations (schema.prisma)

**Alterar o `schema.prisma` é a operação que mais exige atenção** ela envolve duas etapas obrigatórias.

### Por que duas etapas?

- `migrate dev` → **cria** o arquivo de migração (`.sql`) e atualiza o banco
- `prisma generate` → **regenera** o Prisma Client com os novos tipos TypeScript
- O rebuild da imagem é necessário porque o Prisma Client fica dentro do `node_modules` da imagem

### Passo a passo ao alterar o schema

**1. Altere o `prisma/schema.prisma` normalmente no editor**

**2. Crie a migration dentro do container:**
```bash
# Substitua "nome_descritivo" por algo que descreva a mudança
docker exec -it filo-backend pnpm exec prisma migrate dev --name nome_descritivo

# Ou pelo script
pnpm docker:migrate
```
> O comando vai pedir o nome da migration interativamente se você não passar `--name`.

**3. Rebuilde a imagem para regenerar o Prisma Client:**
```bash
docker compose up --build

# Ou pelo script
pnpm docker:up:build
```

> Sem o rebuild, o NestJS continuará usando o Prisma Client antigo e pode apresentar erros de tipo ou runtime.


## Scripts disponíveis

Atalhos configurados no `package.json` para abstrair os comandos Docker mais comuns:

| Script | Comando equivalente | Descrição |
|---|---|---|
| `pnpm docker:up` | `docker compose up` | Sobe o ambiente |
| `pnpm docker:up:build` | `docker compose up --build` | Sobe com rebuild |
| `pnpm docker:down` | `docker compose down` | Para e remove containers |
| `pnpm docker:reset` | `docker compose down -v && up --build` | Apaga banco e recomeça |
| `pnpm docker:seed` | `RUN_SEED=true docker compose up --build` | Sobe com seed |
| `pnpm docker:logs` | `docker compose logs -f api` | Acompanha logs da API |
| `pnpm docker:migrate` | `docker exec ... prisma migrate dev` | Cria nova migration |
| `pnpm docker:studio` | `docker exec ... prisma studio` | Abre o Prisma Studio |


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

- **Resetar banco e repopular do zero:**
  ```bash
  pnpm docker:reset
  # Depois suba com seed:
  pnpm docker:seed
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
- **Massa de Dados:** O seed gera automaticamente fabricos, facções, clientes, usuários (Admin/Proprietário) e fluxos de Kanban completos para testes.
- **Segurança:** Nunca comite o arquivo `.env` com chaves reais. Use sempre o `.env.example` como base.