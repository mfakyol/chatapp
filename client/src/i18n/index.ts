import { messages } from '@/i18n/messages';

type Params = Record<string, string | number>;

/**
 * Resolve a dotted message key (e.g. `sidebar.friends`) and interpolate any
 * `{param}` placeholders. Returns the key itself if it can't be resolved, so a
 * missing string is visible rather than silently blank.
 */
export function t(key: string, params?: Params): string {
  const resolved = key
    .split('.')
    .reduce<unknown>((node, part) => {
      if (node && typeof node === 'object') return (node as Record<string, unknown>)[part];
      return undefined;
    }, messages);

  if (typeof resolved !== 'string') return key;
  if (!params) return resolved;

  return Object.entries(params).reduce(
    (str, [name, value]) => str.replaceAll(`{${name}}`, String(value)),
    resolved
  );
}

export { messages };
