import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/** Back to where the screen came from, or to the tabs when there is nothing to go back to. */
export function leaveScreen(router: Router): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
