/** The name on the Profile card: the user's, or "Player" until they set one. */
export const displayName = (name: string) => name.trim() || 'Player';

/** The avatar's letter when there is no photo, or `undefined` with no name (a person icon then). */
export function initialOf(name: string): string | undefined {
  const first = [...name.trim()][0];
  return first?.toLocaleUpperCase();
}

/** "No workouts logged yet", "1 workout logged", "8 workouts logged". */
export function workoutsLogged(count: number): string {
  if (count === 0) return 'No workouts logged yet';
  return `${count} ${count === 1 ? 'workout' : 'workouts'} logged`;
}
