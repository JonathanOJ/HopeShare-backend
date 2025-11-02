# HopeShare Backend

> Plataforma de crowdfunding para campanhas sociais e projetos comunitários

Backend serverless construído com Node.js, Express e AWS, oferecendo uma API RESTful completa para gerenciamento de campanhas, doações, usuários e relatórios financeiros.

## Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Executando o Projeto](#-executando-o-projeto)
- [Testes](#-testes)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API Endpoints](#-api-endpoints)
- [Deploy](#-deploy)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

## Sobre o Projeto

O HopeShare é uma plataforma de crowdfunding focada em campanhas sociais, permitindo que usuários criem, gerenciem e doem para causas importantes. O backend oferece:

- **Gestão de Campanhas**: CRUD completo com validações e controle de status
- **Sistema de Doações**: Integração com Mercado Pago para pagamentos
- **Autenticação de Usuários**: Sistema robusto com validação de CPF/CNPJ
- **Relatórios Financeiros**: Geração de relatórios em PDF e CSV
- **Gestão de Depósitos**: Sistema de aprovação de saques para criadores
- **Validação de Empresas**: Processo de verificação com upload de documentos
- **Sistema de Denúncias**: Moderação e gestão de reportes
- **Configuração de Recebimento**: Dados bancários e preferências de PIX

## Tecnologias

### Core

- **Node.js** (v18.x) - Runtime JavaScript
- **Express.js** - Framework web
- **Serverless Framework** - Deploy e infraestrutura como código

### AWS Services

- **DynamoDB** - Banco de dados NoSQL
- **S3** - Armazenamento de arquivos (documentos, relatórios)
- **Lambda** - Funções serverless
- **API Gateway** - Gerenciamento de APIs

### Integrações

- **Mercado Pago** - Gateway de pagamento
- **PDFKit** - Geração de relatórios em PDF

### Desenvolvimento

- **Jest** - Framework de testes (200+ testes unitários)
- **Nodemon** - Hot reload em desenvolvimento
- **ESLint** - Linting de código
- **Bcrypt.js** - Criptografia de senhas

## Arquitetura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Cliente   │─────▶│  API Gateway │─────▶│   Lambda    │
└─────────────┘      └──────────────┘      └─────────────┘
                                                    │
                           ┌────────────────────────┼────────────────────────┐
                           ▼                        ▼                        ▼
                    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
                    │  DynamoDB   │         │     S3      │         │ Mercado Pago│
                    │  (Database) │         │   (Files)   │         │  (Payment)  │
                    └─────────────┘         └─────────────┘         └─────────────┘
```

### Padrão MVC

- **Models**: Camada de acesso a dados (DynamoDB)
- **Controllers**: Lógica de negócio e validações
- **Routes**: Definição de endpoints e middlewares
- **Services**: Serviços externos (S3, Mercado Pago)

## Pré-requisitos

- Node.js >= 18.x
- npm >= 8.x
- Conta AWS com credenciais configuradas
- Conta Mercado Pago (para pagamentos)

## Instalação

1. **Clone o repositório**

```bash
git clone https://github.com/JonathanOJ/HopeShare-backend.git
cd HopeShare-backend
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente** (veja [Configuração](#-configuração))

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
# AWS Configuration
AWS_REGION=us-east-1
USERS_TABLE=hopeshare-users
CAMPANHA_TABLE=hopeshare-campanha
DEPOSIT_REQUEST_TABLE=hopeshare-deposit-request
VALIDATION_USER_TABLE=hopeshare-validation-user
DONATION_TABLE=hopeshare-donation
REPORTS_TABLE=hopeshare-reports
FINANCE_REPORT_TABLE=hopeshare-finance-reports-v2
CONFIG_RECEIPT_TABLE=hopeshare-config-receipt
BANK_TABLE=hopeshare-bank

# S3 Configuration
S3_BUCKET_NAME=hopeshare-uploads
S3_REGION=us-east-1

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=your_access_token_here
MERCADO_PAGO_PUBLIC_KEY=your_public_key_here

# Application
PORT=3000
NODE_ENV=development
```

### Configuração AWS Local

Para desenvolvimento local, configure suas credenciais AWS:

```bash
aws configure
```

Ou use variáveis de ambiente:

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Executando o Projeto

### Desenvolvimento Local

```bash
# Modo desenvolvimento (com hot reload)
npm run dev

# Modo produção local
npm start
```

O servidor estará disponível em `http://localhost:3000`

### Serverless Offline (simulação AWS local)

```bash
# Instale o plugin serverless-offline
npm install -g serverless-offline

# Execute localmente
serverless offline start
```

## Testes

O projeto conta com **200 testes unitários** cobrindo todos os controllers principais.

```bash
# Executar todos os testes
npm test

# Executar apenas testes unitários
npm run test:unit

# Modo watch (desenvolvimento)
npm run test:watch

# Testes com cobertura
npm test -- --coverage
```

### Cobertura de Testes

- **9 Test Suites** (100% passando)
- **200 Testes** (100% passando)
- **Tempo de execução**: ~0.96s
- **Cobertura**: 70%+ dos controllers

Veja mais detalhes em [`src/controllers/__tests__/SUMMARY.md`](src/controllers/__tests__/SUMMARY.md)

## Estrutura do Projeto

```
hopeshare-backend/
├── src/
│   ├── controllers/          # Lógica de negócio
│   │   ├── __tests__/        # Testes unitários (200 testes)
│   │   ├── bankController.js
│   │   ├── campanhaController.js
│   │   ├── configReceiptController.js
│   │   ├── depositController.js
│   │   ├── donationController.js
│   │   ├── financialReportController.js
│   │   ├── reportController.js
│   │   ├── userController.js
│   │   └── validationUserController.js
│   ├── models/               # Camada de dados (DynamoDB)
│   │   ├── bankModel.js
│   │   ├── campanhaModel.js
│   │   ├── configReceiptModel.js
│   │   ├── depositModel.js
│   │   ├── reportModel.js
│   │   ├── userModel.js
│   │   └── validationUserModel.js
│   ├── services/             # Serviços externos
│   │   ├── fileService.js    # Geração de PDFs
│   │   ├── mercadoPagoService.js
│   │   └── uploadService.js  # Upload para S3
│   ├── app.js                # Configuração Express
│   ├── router.js             # Definição de rotas
│   ├── server.js             # Servidor local
│   └── handler.js            # Handler Serverless
├── serverless.yml            # Configuração Serverless
├── package.json
├── .env                      # Variáveis de ambiente (não commitado)
└── README.md
```

## API Endpoints

### Usuários (`/users`)

```
POST   /users/signin           - Login de usuário
POST   /users                  - Criar usuário
PUT    /users/:id              - Atualizar usuário
DELETE /users/:id              - Deletar usuário
GET    /users/email/:email     - Buscar por email
GET    /users/cpf/:cpf         - Buscar por CPF
GET    /users/cnpj/:cnpj       - Buscar por CNPJ
GET    /users/:id              - Buscar por ID
GET    /users/:id/campanhas    - Campanhas do usuário
```

### Campanhas (`/campanhas`)

```
POST   /campanhas              - Criar campanha
GET    /campanhas/:id          - Buscar campanha
GET    /campanhas/user/:userId - Listar campanhas do usuário
POST   /campanhas/search       - Buscar campanhas (filtros)
DELETE /campanhas/:id          - Deletar campanha
PUT    /campanhas/:id/status   - Atualizar status (admin)
PUT    /campanhas/:id/suspend  - Suspender campanha (admin)
PUT    /campanhas/:id/reactivate - Reativar campanha (admin)
```

### Doações (`/donations`)

```
POST   /donations              - Criar doação
GET    /donations/user/:userId - Doações do usuário
GET    /donations/campanha/:campanhaId - Doações da campanha
POST   /donations/:id/refund   - Reembolsar doação
POST   /donations/webhook      - Webhook Mercado Pago
```

### Depósitos (`/deposits`)

```
POST   /deposits               - Solicitar depósito
GET    /deposits/user/:userId  - Minhas solicitações
PUT    /deposits/:id/status    - Atualizar status (admin)
GET    /deposits/pending       - Listar pendentes (admin)
```

### Relatórios (`/reports`)

```
POST   /reports/export         - Exportar relatório financeiro
GET    /reports/:userId        - Listar relatórios do usuário
DELETE /reports/:reportId      - Deletar relatório
```

### Validações (`/validations`)

```
POST   /validations            - Enviar validação de empresa
GET    /validations/:userId    - Buscar validação do usuário
PUT    /validations/:id/admin  - Aprovar/Rejeitar (admin)
GET    /validations/pending    - Listar pendentes (admin)
```

### Configurações de Recebimento (`/config-receipt`)

```
POST   /config-receipt         - Salvar configuração
GET    /config-receipt/:userId - Buscar configuração
```

### Bancos (`/banks`)

```
POST   /banks/search           - Buscar bancos
GET    /banks/:id              - Detalhes do banco
```

### Denúncias (`/denuncias`)

```
POST   /denuncias              - Denunciar campanha
GET    /denuncias              - Listar denúncias (admin)
GET    /denuncias/grouped      - Denúncias agrupadas (admin)
PUT    /denuncias/:id/status   - Atualizar status (admin)
```

## Deploy

### Deploy para AWS Lambda

```bash
# Configurar credenciais AWS (primeira vez)
serverless config credentials --provider aws --key YOUR_KEY --secret YOUR_SECRET

# Deploy completo
serverless deploy

# Deploy de função específica
serverless deploy function -f app

# Ver logs
serverless logs -f app -t
```

### Variáveis de Ambiente no Serverless

As variáveis são definidas no `serverless.yml`:

```yaml
provider:
  environment:
    USERS_TABLE: ${self:custom.usersTableName}
    CAMPANHA_TABLE: ${self:custom.campanhaTableName}
    # ... outras variáveis
```

### Deploy CI/CD

Para automatizar o deploy, configure GitHub Actions ou outro CI/CD:

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: serverless deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- Use nomes descritivos em português para variáveis e funções
- Adicione testes unitários para novas features
- Mantenha a cobertura de testes acima de 70%
- Siga os padrões ESLint configurados
- Documente funções complexas com JSDoc

### Rodando Testes Localmente

Antes de abrir um PR, garanta que todos os testes passam:

```bash
npm test
```

## Equipe

Desenvolvido por Jonathan Jacobovski..

## Suporte

Para questões e suporte:

- Abra uma [issue](https://github.com/JonathanOJ/HopeShare-backend/issues)
- Entre em contato: jonathan.ojacobovski@gmail.com

---

**Feito com ❤️ pela equipe HopeShare**
