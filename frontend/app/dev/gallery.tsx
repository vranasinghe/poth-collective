import { Redirect } from 'expo-router';

/**
 * Development-only component gallery (route: /dev/gallery).
 *
 * The `require` lives INSIDE the `if (__DEV__)` block on purpose: Metro folds `__DEV__` to `false` in production and
 * drops the block before collecting dependencies, so the gallery and its sample data are not shipped. (A `require`
 * placed after an early `return` would still be bundled.) In production this route just redirects home.
 */
export default function GalleryRoute() {
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Gallery = require('../../src/ui/gallery/Gallery').default;
    return <Gallery />;
  }
  return <Redirect href="/" />;
}
