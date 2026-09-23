import { relations, sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { CATEGORIES, SESSION_STATUSES, TARGET_MODES, TRACKING_TYPES } from '@/domain/types';

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '));

const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });

const createdAt = () =>
  timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  timestamp('updated_at')
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

export const exercises = sqliteTable(
  'exercises',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    seedKey: text('seed_key').unique(),
    name: text('name').notNull(),
    category: text('category', { enum: CATEGORIES }).notNull(),
    description: text('description').notNull().default(''),
    mediaUrl: text('media_url'),
    trackingType: text('tracking_type', { enum: TRACKING_TYPES }).notNull(),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    archivedAt: timestamp('archived_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('exercises_category_check', sql`${t.category} in (${inList(CATEGORIES)})`),
    check('exercises_tracking_type_check', sql`${t.trackingType} in (${inList(TRACKING_TYPES)})`),
  ],
);

export const routines = sqliteTable('routines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  archivedAt: timestamp('archived_at'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const workouts = sqliteTable(
  'workouts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    routineId: integer('routine_id')
      .notNull()
      .references(() => routines.id),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    archivedAt: timestamp('archived_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('workouts_routine_id_idx').on(t.routineId)],
);

export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workoutId: integer('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id),
    position: integer('position').notNull(),
    targetMode: text('target_mode', { enum: TARGET_MODES }),
  },
  (t) => [
    index('workout_exercises_workout_id_idx').on(t.workoutId),
    check(
      'workout_exercises_target_mode_check',
      sql`${t.targetMode} is null or ${t.targetMode} in (${inList(TARGET_MODES)})`,
    ),
  ],
);

export const templateSets = sqliteTable(
  'template_sets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workoutExerciseId: integer('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    targetValue: integer('target_value'),
  },
  (t) => [index('template_sets_workout_exercise_id_idx').on(t.workoutExerciseId)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workoutId: integer('workout_id').references(() => workouts.id),
    name: text('name').notNull(),
    status: text('status', { enum: SESSION_STATUSES }).notNull(),
    startedAt: timestamp('started_at').notNull(),
    finishedAt: timestamp('finished_at'),
  },
  (t) => [
    check('sessions_status_check', sql`${t.status} in (${inList(SESSION_STATUSES)})`),
    uniqueIndex('sessions_single_in_progress_idx')
      .on(t.status)
      .where(sql`${t.status} = 'in_progress'`),
  ],
);

export const sessionExercises = sqliteTable(
  'session_exercises',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    category: text('category', { enum: CATEGORIES }).notNull(),
    trackingType: text('tracking_type', { enum: TRACKING_TYPES }).notNull(),
    targetMode: text('target_mode', { enum: TARGET_MODES }),
    note: text('note').notNull().default(''),
  },
  (t) => [
    index('session_exercises_session_id_idx').on(t.sessionId),
    check('session_exercises_category_check', sql`${t.category} in (${inList(CATEGORIES)})`),
    check(
      'session_exercises_tracking_type_check',
      sql`${t.trackingType} in (${inList(TRACKING_TYPES)})`,
    ),
    check(
      'session_exercises_target_mode_check',
      sql`${t.targetMode} is null or ${t.targetMode} in (${inList(TARGET_MODES)})`,
    ),
  ],
);

export const sessionSets = sqliteTable(
  'session_sets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionExerciseId: integer('session_exercise_id')
      .notNull()
      .references(() => sessionExercises.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    targetValue: integer('target_value'),
    loggedValue: integer('logged_value'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('session_sets_session_exercise_id_idx').on(t.sessionExerciseId)],
);

export const routinesRelations = relations(routines, ({ many }) => ({
  workouts: many(workouts),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  routine: one(routines, {
    fields: [workouts.routineId],
    references: [routines.id],
  }),
  exercises: many(workoutExercises),
}));

export const workoutExercisesRelations = relations(workoutExercises, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [workoutExercises.workoutId],
    references: [workouts.id],
  }),
  exercise: one(exercises, {
    fields: [workoutExercises.exerciseId],
    references: [exercises.id],
  }),
  sets: many(templateSets),
}));

export const templateSetsRelations = relations(templateSets, ({ one }) => ({
  workoutExercise: one(workoutExercises, {
    fields: [templateSets.workoutExerciseId],
    references: [workoutExercises.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [sessions.workoutId],
    references: [workouts.id],
  }),
  exercises: many(sessionExercises),
}));

export const sessionExercisesRelations = relations(sessionExercises, ({ one, many }) => ({
  session: one(sessions, {
    fields: [sessionExercises.sessionId],
    references: [sessions.id],
  }),
  exercise: one(exercises, {
    fields: [sessionExercises.exerciseId],
    references: [exercises.id],
  }),
  sets: many(sessionSets),
}));

export const sessionSetsRelations = relations(sessionSets, ({ one }) => ({
  sessionExercise: one(sessionExercises, {
    fields: [sessionSets.sessionExerciseId],
    references: [sessionExercises.id],
  }),
}));
