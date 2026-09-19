# Decisões — pendências do briefing

Registradas conforme escolhido pelo usuário (defaults sugeridos pelo texto).

1. **Cadastro existente.** Repositório estava vazio — não existe cadastro de
   fornecedor prévio no ERP. Módulo A é construído do zero.
2. **LMC repetido em períodos diferentes.** Vira linhas separadas (uma por
   período), nunca agrupado — preserva a data de cada necessidade.
   A agregação só acontece dentro do mesmo período, no cálculo (B3).
3. **Granularidade do período.** Bloco fechado (o cenário define um período
   — ex. mês ou trimestre — e cada linha de fabricação aponta para um
   período do horizonte), não data de fabricação por linha.
4. **Preço cotado divergente do planejado.** Fica registrado no cenário
   (campo `cotado` na linha do plano) até aprovação manual; não sobrescreve
   `ComponentSupplier.precoUnitario` automaticamente. Uma ação explícita
   "aplicar ao cadastro" fica para uma fase futura.
5. **Escolha de fornecedor quando há vários para o mesmo componente.** O
   cálculo usa o fornecedor preferencial (`ComponentSupplier.preferencial`)
   por padrão; o usuário pode sobrescrever item a item na linha do plano
   antes de aprovar o cenário.
6. **Bloqueio por qualificação.** Fornecedor não qualificado ou com
   certificado vencido é bloqueado de fato no fluxo de cotação (não entra
   em `Quotation` sem override explícito e registrado).
