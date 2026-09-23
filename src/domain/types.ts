export const TRACKING_TYPES = ['makes_attempts', 'check'] as const;
export type TrackingType = (typeof TRACKING_TYPES)[number];

export const TARGET_MODES = ['makes', 'attempts'] as const;
export type TargetMode = (typeof TARGET_MODES)[number];

export const CATEGORIES = [
  'finishing',
  'ball_handling',
  'dribbling',
  'shooting',
  'footwork',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SESSION_STATUSES = ['in_progress', 'finished'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  finishing: 'Finishing',
  ball_handling: 'Ball Handling',
  dribbling: 'Dribbling',
  shooting: 'Shooting',
  footwork: 'Footwork',
};
