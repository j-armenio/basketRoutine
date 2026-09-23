Atue como um Engenheiro de Software Sênior e Especialista em UI/UX. Quero criar um aplicativo Android simples para anotação de rotinas de treino de basquete, fortemente inspirado no fluxo de usuário e design do aplicativo "Hevy" (focado em musculação), mas adaptado para o basquete.

Decida uma stack tecnologica que funcione em android, seja simples de fazer desenvolver, testar e fazer deploy.
Entidades e Fluxo Principal:
O app deve seguir a estrutura: Rotina (Routine) -> Treino Ativo (Workout) -> Exercícios -> Séries (Sets).
Em vez de "Peso e Repetições" (como na musculação), as séries no basquete serão medidas por "Tentativas (Attempts) e Acertos (Makes)", permitindo o cálculo automático do FG% (Field Goal Percentage).

# Funcionalidades Obrigatórias (Requisitos):

## 1. Gestão de Rotinas e Treinos:

- Rotina eh um conjunto de Treinos. Treinos são um conjunto de exercicíos. Exercícios possuem séries.
- Criação, edição e exclusão de rotinas, treinos, exercicios, sets.
- Interface de "Treino Ativo", onde o usuário anota os dados na quadra em tempo real.
- Durante um treino, a quantidade de "Makes" eh o objetivo a ser atingido, e as "attemps" são a parte que o usuário vai anotar durante o treino.

## 2. Catálogo de Exercícios:

- Biblioteca pré-definida dividida por categorias (ex: Finishing, Ball Handling, Dribbling, Shooting, Footwork).
- Criação de exercícios customizados pelo usuário.
- Cada exercício (seja padrão ou customizado) deve ter suporte no banco de dados para: Nome, Categoria, Descrição em texto e mídia (link para GIF ou vídeo curto demonstrando o movimento correto).

## 3. Anotação de Séries (Sets):

- Adicionar múltiplas séries para o mesmo exercício.
- Campos de input para cada série: "Tentativas" (Attempts) e "Acertos" (Makes).
- Um campo de texto livre (Observação/Nota) atrelado a cada exercício dentro do treino em andamento.

# Restrições

- Deve rodar em android.
- Deve ser relativamente simples de desenvolver, fazer deploy e usar no dispositivo.

Gere um plano de alto nível (marcos/fases, sem detalhes de implementação) para o desenvolvimento passo-a-passo.

Faça perguntas caso necessário para deixar o plano mais completo.

Salve o plano em um arquivo **docs/PLAN.md**.