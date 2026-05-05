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
   # git clone
   git clone https://github.com/filo-scc/filo-back.git
   
   # ou através do github cli
   # gh repo clone filo-scc/filo-back

   cd filo-back
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env

   ```

    *Edite o arquivo `.env` e preencha suas senha do database e as chaves JWT (instruções no arquivo).*

   ```bash
   # Rode o comando 2x, uma para cada chave JWT
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```



3. **Suba o ambiente com Seed (primeira vez):**
   ```bash
   # Para terminal bash
   RUN_SEED=true docker compose up --build
   ```
   
   ```Powershell
   # Powershell
   $env:RUN_SEED="true"; docker compose up --build
   ```
   *Isso irá construir a imagem, subir o banco, rodar as migrações e popular os dados iniciais.*

4. **Uso diário:**
   ```bash
   docker compose up
   ```


## Gerenciamento do Banco (Prisma)

- **Visualizar dados (Interface Gráfica):**
  ```bash
  # Local
  npx prisma studio
  # Docker
  docker exec -it filo-backend pnpm exec prisma studio
  ```

- **Criar nova migração:**
  ```bash
  npx prisma migrate dev --name <nome_da_migracao>
  ```

- **Resetar banco e repopular:**
  ```bash
  npx prisma migrate reset
  ```


## Testes

```bash
# Testes unitários
pnpm run test

# Testes E2E
pnpm run test:e2e

# Cobertura de testes
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
- **Massa de Dados:** O comando de seed gera automaticamente empresas (fabricos), facções, clientes, usuários (Admin/Proprietário) e fluxos de Kanban completos para testes.
- **Segurança:** Nunca comite o arquivo `.env` com chaves reais. Utilize sempre o `.env.example` como base.
