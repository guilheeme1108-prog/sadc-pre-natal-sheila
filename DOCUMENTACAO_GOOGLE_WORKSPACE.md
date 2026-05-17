# Documentação Técnica: SADC Pré-Natal no Google Workspace

Este documento descreve a arquitetura e as fórmulas necessárias para implantar o Sistema de Apoio à Decisão Clínica (SADC) utilizando as ferramentas gratuitas do Google (Forms, Sheets e Looker Studio), garantindo custo zero e replicabilidade.

## 1. Google Forms (A Interface de Coleta)

O formulário deve ser desenhado para preenchimento extremamente rápido.

**Campos Obrigatórios:**
1. Nome da Gestante (Texto curto)
2. CNS ou CPF (Texto curto - com validação de número)
3. Data da Última Menstruação - DUM (Data)
4. Data do Atendimento Atual (Data)
5. Profissional Responsável (Lista suspensa)
6. Tipo de Equipe (Múltipla escolha: `eSF - Tipo 70` ou `eAP - Tipo 76`)

**Checkboxes das Boas Práticas (Selecionar apenas o que foi feito HOJE):**
- [A] 1ª consulta pré-natal (gestante com até 12 semanas)
- [B] Consulta médica/enfermeiro realizada hoje
- [C] Aferição de Pressão Arterial registrada hoje
- [D] Peso e Altura registrados simultaneamente hoje
- [E] Visita domiciliar realizada por ACS/TACS (Apenas eSF)
- [F] Vacina dTpa aplicada/registrada nesta gestação
- [G] Exames do 1º Trimestre (Sífilis, HIV, Hep B e C) avaliados
- [H] Exames do 3º Trimestre (Sífilis, HIV) avaliados
- [I] Consulta de puerpério realizada
- [J] Visita domiciliar de puerpério realizada por ACS/TACS (Apenas eSF)
- [K] Atividade em Saúde Bucal realizada hoje

---

## 2. Google Sheets (O Cérebro Matemático)

A planilha vinculada ao formulário será a base de dados. Nela, criaremos **Colunas Calculadas** (via `ARRAYFORMULA`) para processar os dados automaticamente sem intervenção humana.

### A. Cálculo da Idade Gestacional (IG em Semanas)
```excel
=ARRAYFORMULA(SE(A2:A=""; ""; INT((DATA_ATENDIMENTO - DUM) / 7)))
```

### B. Cálculo da Data Provável do Parto (DPP)
```excel
=ARRAYFORMULA(SE(A2:A=""; ""; DUM + 280)) 
```
*(Nota: O período gestacional oficial para cálculo C3 vai até 294 dias ou 42 semanas)*

### C. Acúmulo de Consultas e Procedimentos (Aba "Consolidado por Gestante")
Use a função `QUERY` ou `SOMASES` para agregar o total de práticas realizadas por cada CPF/CNS único.

Exemplo para contar as consultas (Boa Prática B):
```excel
=CONT.SES('Respostas do Formulário'!$B:$B; $A2; 'Respostas do Formulário'!$H:$H; "Sim")
```
*(Onde $B:$B é a coluna de CPF na aba de respostas, $A2 é o CPF único da gestante, e $H:$H é a coluna do checkbox B).*

### D. Cálculo da Pontuação (Nota C3 de 0 a 100)
Para cada gestante, crie colunas de validação de pontuação baseadas nos acúmulos:

- **(A) Captação:** `SE(E(PRIMEIRA_CONSULTA <= 12); 10; 0)`
- **(B) Consultas:** `SE(TOTAL_CONSULTAS >= 7; 9; 0)`
- **(C) PA:** `SE(TOTAL_PA >= 7; 9; 0)`
- **(D) Antropometria:** `SE(TOTAL_ANTROPO >= 7; 9; 0)`
- **(E) Visitas Gestação:** `SE(E(EQUIPE="eSF - Tipo 70"; TOTAL_VISITAS >= 3); 9; 0)`
- **(F) Vacina dTpa:** `SE(VACINA="Sim"; 9; 0)`
- **(G) Exames 1º Tri:** `SE(EXAME_1="Sim"; 9; 0)`
- **(H) Exames 3º Tri:** `SE(EXAME_3="Sim"; 9; 0)`
- **(I) Consulta Puerpério:** `SE(CONSULTA_PUERPERIO>=1; 9; 0)`
- **(J) Visita Puerpério:** `SE(E(EQUIPE="eSF - Tipo 70"; VISITA_PUERPERIO>=1); 9; 0)`
- **(K) Saúde Bucal:** `SE(ODONTO>=1; 9; 0)`

**Nota Final:**
```excel
=SOMA(PONTOS_A:PONTOS_K)
```
*(Se a equipe for eAP - Tipo 76, dividir o total por 82 e multiplicar por 100).*

### E. Lógica Semafórica (Alertas)
Crie colunas para cada alerta:
- **Alerta Vacina dTpa:** 
```excel
=SE(E(VACINA="Não"; IG>30); "🔴 Vermelho"; SE(E(VACINA="Não"; IG>=20); "🟡 Amarelo"; "🟢 Verde"))
```
- **Alerta Exames 1º Tri:** 
```excel
=SE(E(EXAMES_1="Não"; IG>=13); "🔴 Vermelho"; SE(E(EXAMES_1="Não"; IG>=9); "🟡 Amarelo"; "🟢 Verde"))
```

---

## 3. Looker Studio (O Dashboard)

1. Conecte o Google Sheets como fonte de dados no Looker Studio.
2. Atualize os campos de alertas para o tipo "Texto" e a pontuação para "Número".
3. **Visão da Equipe:** Use um gráfico de pizza/rosca ou velocímetro filtrando as "Gestantes Ativas" agrupadas pela cor do Semáforo Geral (A pior cor entre todas as pendências determina a cor geral da gestante).
4. **Lista de Gestantes:** Crie uma tabela contendo `Nome`, `IG Atual`, `Pontuação`, e `Status Semáforo`. Adicione formatação condicional na tabela para pintar as linhas de acordo com o texto (🔴, 🟡, 🟢).
5. **Busca Ativa:** Adicione um controle de filtro (Dropdown) permitindo filtrar por "Vermelho" ou "Amarelo" para focar a atuação diária dos ACS e Enfermeiros.
