# Sistema de Planejamento e Suprimentos

Dois módulos que trabalham juntos: o Módulo A guarda os cadastros mestres de
suprimentos (fornecedor, componente, e a relação entre os dois); o Módulo B
lê esses dados para planejar compras e custos por cenário. O planejamento
nunca escreve no cadastro.

## Estrutura

- `server/` — API em Node.js + TypeScript + Express + Prisma (PostgreSQL)
- `web/` — Frontend em React + TypeScript + Vite

## Rodando localmente

```bash
# banco de dados
createdb supply_planning

# backend
cd server
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed
npm run dev

# frontend (outro terminal)
cd web
npm install
npm run dev
```

## Módulos

### Módulo A — Cadastros de suprimentos
Fornecedor (identificação, contatos, condições comerciais), certificações e
qualificação (com alertas de vencimento e bloqueio de fluxo), componente, e
a relação componente × fornecedor (preço, conversão de unidade, lote
mínimo, múltiplo de compra, lead time, histórico de preço).

### Módulo B — Centro de planejamento e custos
Cenários com taxa de câmbio fixa, linhas de fabricação (LMC + quantidade +
período), motor de cálculo (conversão, lote mínimo/múltiplo, recuo por lead
time, agregação por período, saldo carregado), os 4 alertas obrigatórios,
plano de compras e resumo por período/LMC/fornecedor/total.

Ver `docs/DECISIONS.md` para as decisões tomadas sobre as pendências do
briefing original.
