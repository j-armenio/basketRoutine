-- Custom SQL migration file, put your code below! --
-- A tactical board can no longer be saved empty (see `validateBoard`), so an empty one left over
-- from before that rule is turned into no board at all.
UPDATE `workout_exercises` SET `tactical_board` = NULL WHERE `tactical_board` IS NOT NULL AND json_array_length(`tactical_board`, '$.elements') = 0;
--> statement-breakpoint
UPDATE `session_exercises` SET `tactical_board` = NULL WHERE `tactical_board` IS NOT NULL AND json_array_length(`tactical_board`, '$.elements') = 0;
