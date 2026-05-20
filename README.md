# Filo Backend

O **Filo Backend** é o motor central do projeto Filo, desenvolvido para gerenciar o fluxo de produção têxtil, desde a modelagem até a embalagem (Kanban), controle de clientes, facções e fichas técnicas.

## Tecnologias

- **Framework:** [NestJS](https://nestjs.com/) (v11+)
- **Linguagem:** TypeScript
- **ORM:** [Prisma](https://www.prisma.io/)
- **Banco de Dados:** PostgreSQL
- **Containerização:** Docker & Docker Compose
- **Autenticação:** JWT (Access & Refresh Tokens)


## Instalando o pnpm

Este projeto utiliza o `pnpm` como gerenciador de pacotes. Caso não tenha instalado:


**Alternativa (Linux e Windows), via npm:**
```bash
npm install -g pnpm
```

Verifique a instalação:
```bash
pnpm --version
```


## Pré-requisitos

Escolha **um** dos modos abaixo e instale o que for necessário:

| | 🐳 Docker (recomendado) | 💻 Local |
|---|---|---|
| Instalar | [Docker Desktop](https://www.docker.com/) | [Node.js](https://nodejs.org/) v18+ e [pnpm](https://pnpm.io/) e [PostgreSQL](https://www.postgresql.org/) |
| Banco | Automático | Manual |


## Quickstart Docker (recomendado)

Sobe a API e o banco juntos, sem instalar nada além do Docker.

### Setup inicial

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

3. **Suba o ambiente com Seed (primeira vez):**
   ```bash
   # Linux / macOS
   RUN_SEED=true docker compose up --build
   ```
   ```powershell
   # PowerShell
   $env:RUN_SEED="true"; docker compose up --build
   ```
   Ou pelo script:
   ```bash
   pnpm docker:seed
   ```
   > **Windows:** antes de usar scripts `pnpm docker:*` pela primeira vez:
   > ```bash
   > pnpm add -D cross-env
   > ```

### Uso diário

```bash
docker compose up
# ou
pnpm docker:up
```

### Quando fazer rebuild e quando resetar o banco

#### 1. Mudanças no código TypeScript (controller, service, dto):
Hot-reload cuida sozinho — nenhuma ação necessária.

#### 2. Mudanças no `schema.prisma`:
```bash
pnpm docker:reset:seed
```
> Apaga todos os dados e repopula via seed. É o fluxo esperado durante o desenvolvimento.

| Situação | Comando | Perde dados? |
|---|---|---|
| Mudança em `.ts` | Nenhum (hot-reload) | ❌ |
| Mudança no `schema.prisma` | `pnpm docker:reset:seed` | ✅ (repopula) |
| Resetar banco sem seed | `pnpm docker:reset` | ✅ |
| Primeira vez subindo | `pnpm docker:seed` | — |

### Scripts disponíveis

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
| `pnpm docker:studio` | Abre o Prisma Studio em http://localhost:5555 |


## Troubleshoot
### IntelliSense e Erros do VS Code após mudança no Schema

Após alterar o `schema.prisma`, o VS Code pode exibir erros como:

```
Property 'fabricoGrade' does not exist on type 'PrismaClient'
```

**Isso não é um erro real**, é o IntelliSense usando o Prisma Client desatualizado do host.

**Solução:**
```bash
pnpm exec prisma generate
```

Se persistir: `Ctrl+Shift+P` → `TypeScript: Restart TS Server`

> Hábito recomendado após qualquer mudança de schema (modo Docker):
> ```bash
> pnpm docker:reset:seed && pnpm exec prisma generate
> ```

---


## Start Modo Local

Roda a API e o banco diretamente no host, sem Docker.

### Setup inicial

1. **Clone o repositório e instale as dependências:**
   ```bash
   git clone https://github.com/filo-scc/filo-back.git
   cd filo-back
   pnpm install
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

   Edite o `.env` e ajuste o `DATABASE_URL` para apontar para o seu PostgreSQL local:
   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/filo_db?schema=public"
   ```

3. **Crie o banco `filo_db` no PostgreSQL local:**

   **Linux (bash):**

   No Linux o PostgreSQL usa autenticação por peer — é necessário usar `sudo` para acessar como o usuário `postgres`:
   ```bash
   # Cria o banco
   sudo -u postgres psql -c "CREATE DATABASE filo_db;"

   # Define uma senha para o usuário postgres (necessário para o DATABASE_URL)
   sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'sua_senha';"
   ```

   **Windows (PowerShell):**

   No Windows o `psql` normalmente já está no PATH após a instalação do PostgreSQL:
   ```powershell
   # Cria o banco
   psql -U postgres -c "CREATE DATABASE filo_db;"
   ```
   Será solicitada a senha do usuário `postgres` definida durante a instalação.

   **Alternativa (Linux e Windows) — pelo DBeaver:**

   Botão direito em `Databases` → `Create Database` → nome `filo_db` → OK.

4. **Aplique as migrações e popule o banco com seed:**
   ```bash
   pnpm exec prisma migrate deploy
   pnpm exec prisma db seed
   ```

5. **Suba a API:**
   ```bash
   pnpm run start:dev
   ```

### Uso diário

```bash
pnpm run start:dev
```

### Gerenciamento do banco

```bash
# Visualizar dados
pnpm exec prisma studio          # Abre em http://localhost:5555

# Criar nova migração
pnpm exec prisma migrate dev --name nome_descritivo

# Resetar banco e repopular
pnpm exec prisma migrate reset
pnpm exec prisma db seed
```


## Testes

```bash
pnpm run test        # Unitários
pnpm run test:e2e    # E2E
pnpm run test:cov    # Cobertura
```


## Estrutura do Projeto

- `src/`: Código fonte da aplicação NestJS.
- `prisma/`: Schema do banco de dados, migrações e scripts de seed.
- `docker/`: Scripts de inicialização e configuração de containers.
- `test/`: Testes de integração (E2E).


---

## Outros Pontos

- **CORS:** O backend está configurado por padrão para aceitar requisições do frontend em `http://localhost:5173`.
- **Massa de Dados:** O comando de seed gera automaticamente empresas (fabricos), facções, clientes, usuários (Admin/Proprietário) e fluxos de Kanban completos para testes.
- **Segurança:** Nunca comite o arquivo `.env` com chaves reais. Utilize sempre o `.env.example` como base.

## Imagem de Produção

O repositório mantém uma imagem dedicada de produção em `Dockerfile.prod`. Ela é separada do Docker de desenvolvimento e:

- compila a API para `dist`
- executa com `NODE_ENV=production`
- inicia com `node dist/src/main.js`
- não usa hot reload, seed, volumes ou `.env` real embutido

### Build local

```bash
docker build -f Dockerfile.prod -t filo-back:prod .
```

### Execução local da imagem

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://usuario:senha@host:5432/database?schema=public" \
  -e JWT_ACCESS_SECRET="troque" \
  -e JWT_REFRESH_SECRET="troque" \
  -e PORT=3000 \
  filo-back:prod
```

As variáveis reais de ambiente não são copiadas da branch nem do `.env`. A imagem é publicada genérica e recebe os valores no runtime.

## CI e GHCR

O workflow em `.github/workflows/ci.yml` faz dois fluxos:

- em PR para `master` ou `main`: valida lint, build da aplicação e build da imagem de produção
- em `push` para `master` ou `main`: publica a imagem no GHCR

Formato esperado da imagem publicada:

```text
ghcr.io/filo-scc/filo-back:latest
ghcr.io/filo-scc/filo-back:sha-<commit>
```

Para o publish funcionar, o repositório precisa permitir escrita de packages para o `GITHUB_TOKEN`.
