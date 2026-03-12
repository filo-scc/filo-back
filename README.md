
# Filo

## 1. Project setup

```bash
$ npm install
```

---

# 2. Configuração do Prisma com PostgreSQL

## 2.1. Criar o banco de dados

Crie o banco de dados em qualquer visualizador que preferir, mas lembre de utilizar **PostgreSQL**.

---

## 2.2. Criar o arquivo `.env`

Crie um arquivo chamado `.env`.

Você pode criar o arquivo manualmente, apenas garantindo que ele esteja dentro da estrutura do projeto.

### Estrutura esperada

```text
Filo-back
|----Arquivos
|----Prisma
|----.env
|----outros files
```

---

## 2.3. Configurar a conexão com o banco

Dentro do arquivo `.env`, coloque a seguinte linha:

```env
DATABASE_URL="postgresql://Name:password@localhost:5432/Name_DB"
```

Onde:

- **Name** = nome da sua conexão  
- **Password** = sua senha  
- **Name_DB** = nome que você deu ao banco de dados  

### Exemplo

```env
DATABASE_URL="postgresql://postgres:123@localhost:5432/postgres"
```

---

## 2.4. Rodar o primeiro migrate

Execute o comando:

```bash
npx prisma migrate
```
---


## 3. Compilar o projeto 

```bash

$ npm run start

```

---

## 4. Rodar testes

```bash
# testes unitarios
$ npm run test

# testes e2e
$ npm run test:e2e

# cobertura de testes
$ npm run test:cov

```


## 5. Comandos uteis 

```bash
# Abrir um visulizador do banco de dados em um local host do prisma, bom para ver se as relações estão ocorrendo como deveriam ocorrer e pra testes

$ npx prisma studio

```
