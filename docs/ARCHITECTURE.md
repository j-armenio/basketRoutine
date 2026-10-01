# Arquitetura: mapa detalhado

Detalhamento do "Mapa do Projeto" do `CLAUDE.md`. As regras de negócio e de UI ficam no
`CLAUDE.md` e em `docs/design.md`; aqui só está o que cada arquivo faz.

## Rotas (`app/`)

O `Stack` raiz (`app/_layout.tsx`) contém as abas e as telas acima delas.

| Rota | Arquivo | Papel |
|---|---|---|
| `/` | `app/(tabs)/index.tsx` | Aba Workout: rotinas como seções, com os cards de workout |
| `/exercises` | `app/(tabs)/exercises.tsx` | Aba Exercises: busca + cards de categoria (5 categorias + Custom) |
| `/profile` | `app/(tabs)/profile.tsx` | Aba Profile: botão de Settings, perfil, estatísticas, gráfico de FG%, últimas 5 sessões |
| — | `app/(tabs)/_layout.tsx` | Abas (`js-top-tabs` com a barra embaixo, swipe entre abas, `ResumeBanner`) |
| `/active-workout` | `app/active-workout.tsx` | Treino em andamento (timer, cards de exercício, Finish) |
| `/add-exercise` | `app/add-exercise.tsx` | Modal de escolha de exercício (`?to=template` adiciona ao rascunho) |
| `/add-to-routine` | `app/add-to-routine.tsx` | Modal: escolhe um workout (ou cria um) e o modo do arremesso |
| `/edit-workout` | `app/edit-workout.tsx` | Editor de template (`?routineId=` cria, `?workoutId=` edita) |
| `/edit-exercise` | `app/edit-exercise.tsx` | Formulário de exercício custom (sem parâmetro cria, `?exerciseId=` edita) |
| `/edit-profile` | `app/edit-profile.tsx` | Formulário do perfil (nome e foto) |
| `/tactical-board` | `app/tactical-board.tsx` | Editor da prancheta tática (`?sessionExerciseId=` ou `?draftKey=`) |
| `/history` | `app/history.tsx` | Histórico completo por mês (o "See all" do Profile) |
| `/settings` | `app/settings.tsx` | Configurações (aberta pelo botão no topo do Profile); estado vazio por enquanto, com a versão do app no rodapé |
| `/session/[id]` | `app/session/[id].tsx` | Detalhe somente leitura de uma sessão finalizada |
| `/workout-summary/[id]` | `app/workout-summary/[id].tsx` | Resumo exibido depois do Finish |
| `/exercise/[id]` | `app/exercise/[id].tsx` | Detalhe do exercício (mídia, descrição, "Your stats", menu ⋮ se custom) |
| `/category/[key]` | `app/category/[key].tsx` | Exercícios de uma categoria (ou `custom`) |

## `src/domain/`: regras puras, sem banco

| Arquivo | Papel |
|---|---|
| `types.ts` | Listas de enums (categorias, `trackingType`, `targetMode`, status) |
| `validation.ts` | Validações que retornam `{ ok, reason }` |
| `errors.ts` | `DomainError`, lançado pelos repositórios |
| `fg.ts` | FG% de um set e sua faixa (`fgBand`: bom > 60, ruim < 40) |
| `summary.ts` | Resumos de exercício e de sessão |
| `exerciseStats.ts` | Estatísticas de um exercício ao longo das sessões |
| `template.ts` | Estrutura comum de template e sessão (detecta se a estrutura mudou no Finish) |
| `tacticalBoard.ts` | Modelo da prancheta (pontos normalizados, elementos), regras e comparação |
| `format.ts` | Formatação de FG%, contagens, duração, timer, datas |
| `media.ts` | Tipo de mídia pela extensão, limite de vídeo |
| `defaults.ts` | Metas padrão, nome do workout pela hora do dia |
| `order.ts` | `moveItem` (reordenação) |
| `messages.ts` | `reasonMessage`: texto de cada `reason` de erro |

## `src/db/`: persistência (SQLite + Drizzle)

| Arquivo | Papel |
|---|---|
| `schema.ts` | Tabelas: `exercises`, `routines`, `workouts`, `workout_exercises`, `template_sets`, `sessions`, `session_exercises`, `session_sets` |
| `types.ts` | Tipo `Db` (serve para expo-sqlite, better-sqlite3 e `tx`) e tipos das linhas |
| `client.ts` | Abre `basket-routine.db` no aparelho |
| `useDatabaseSetup.ts` | Roda as migrations e o seed na inicialização |
| `migrations/` | Gerado pelo `drizzle-kit` (`0000`–`0002`); somente acréscimo, nunca editar |
| `seed/` | Os 38 exercícios predefinidos (`exercises.ts`) e o upsert por `seedKey` (`seed.ts`) |
| `repositories/` | Funções `(db, ...)` por agregado: `exercises`, `routines`, `workouts`, `sessions` (+ `common.ts`) |
| `test-utils.ts` | `createTestDb()`: banco em memória com as migrations reais |

## `src/features/`: uma pasta por funcionalidade

Padrão de cada feature: `actions.ts` (toda escrita: chama o repositório, avisa o `dataStore`,
converte `DomainError` em `{ ok: false, reason }`), `hooks.ts` (leituras que acompanham a versão
dos dados) e os componentes da feature. `src/features/dataStore.ts` é o store único (contador de
versão, `run`, `ActionResult`).

| Pasta | Conteúdo |
|---|---|
| `workout/` | Treino ativo: `ExerciseCard`, linhas de set (`ShootingSetRow`, `CheckSetRow`, `SetNumber`), `useNumberCell` + `setDraft` (salvar a cada tecla, desfazer no blur), `setTable` (colunas), `SetTableHeader`, `ExerciseNote`, `ResumeBanner`, `TargetModeSheet`, `navigation.ts` (`leaveScreen`) |
| `routines/` | Rotinas e templates: `RoutineSection`, `WorkoutCard`, `RoutineChoiceSection`, listas arrastáveis (`DraggableRoutineList`, `DraggableExerciseList`), o editor (`templateDraft.ts`, `draftStore.ts`, `loadDraft.ts`, `TemplateExerciseCard`, `TemplateSetRow`) |
| `history/` | Histórico: `historyList.ts` (itens, agrupamento por mês, dados do gráfico, estatísticas do perfil), `HistoryRow`, `MonthHeader`, `SessionTotals`, `SessionExerciseView`, `FgChart`, `FgEvolutionCard` |
| `exercises/` | Catálogo: `catalogList.ts`, `CategoryCard` + `categoryImages.ts`, `ExerciseList`, `ExerciseRow`, `ExerciseStatsCard`, mídia (`MediaView`, `mediaSource`, `mediaFiles`, `seedMedia`, `videoThumbnail`) |
| `profile/` | Perfil: `profileStorage.ts` (nome e foto no `expo-sqlite/kv-store`, fora do schema), `actions.ts`, `hooks.ts`, `Avatar`, `ProfileCard`, `ProfileStatsCard`, `profileText.ts` |
| `tacticalBoard/` | Prancheta tática: `CourtBoard` (SVG da meia quadra), `BoardToolbar`, `boardEditor.ts` (estado do editor e ferramentas), `courtGeometry.ts`, `loadBoard.ts` (sessão ou rascunho), `TacticalBoardSlot` (miniatura no card) |

## `src/components/`, `src/theme/`, `src/test-utils/`

- `components/`: componentes base (`Screen`, `AppText`, `Button`, `Card`, `ListItem`, `Icon`,
  `IconButton`, `NumberInput`, `TextField`, `ChipRow`, `ActionSheet`, `NameDialog`,
  `SwipeToDelete`, `TabBar`, `BottomActionBar`, `Fab`, `ElapsedTimer`, `StatTile`, `EmptyState`),
  `fgTone.ts`, `haptics.ts` e os hooks de teclado.
- `theme/`: tokens (`colors`, `fonts`, `typography`, `spacing`, `navigationTheme`). Os papéis
  estão em `docs/design.md`.
- `test-utils/a11y.ts`: `expectAccessibleControls()`, chamado em todo teste de fluxo.

## Testes

- Unitários ao lado do código (`*.test.ts(x)`); os de banco usam o docblock
  `@jest-environment node` e `createTestDb()`.
- Fluxos de ponta a ponta em `__tests__/` (`shell`, `active-workout`, `routines`, `history`,
  `exercises`, `tactical-board`), com `renderRouter` e o layout raiz real.
- `jest.setup.js`: mocks de módulos nativos (haptics, file system, image picker, image, video,
  swipeable).

## Configuração e build

| Arquivo | Papel |
|---|---|
| `package.json` | Scripts (`lint`, `format`, `typecheck`, `test`, `db:generate`) e config do Jest (`jest-expo/android`, alias `@/` → `src/`) |
| `app.json` | Config do Expo: nome, ícones, splash, `android.package` (imutável), ID do projeto EAS |
| `eas.json` | Perfis do EAS Build (`preview` gera o APK) |
| `drizzle.config.ts` | `drizzle-kit`: schema em `src/db/schema.ts`, saída em `src/db/migrations` |
| `babel.config.js` / `metro.config.js` | Empacotam os `.sql` das migrations no app |
| `tsconfig.json` / `eslint.config.js` / `.prettierrc` | TypeScript, lint e formatação |
| `.github/workflows/ci.yml` | CI: lint, format, typecheck, testes, schema/migrations em sincronia, `expo-doctor` |
| `.github/workflows/build-apk.yml` | Build manual do APK `preview` (`workflow_dispatch`) |
| `.claude/skills/review-plan/` | Skill do projeto para revisar planos |
