import type { Messages } from '@/i18n/locales';

export type Translator = (key: string, params?: Record<string, string | number>) => string;

type Params = Record<string, string | number>;

function resolveMessage(catalog: Messages, key: string): string | undefined {
  const resolved = key
    .split('.')
    .reduce<unknown>((node, part) => {
      if (node && typeof node === 'object') return (node as Record<string, unknown>)[part];
      return undefined;
    }, catalog);

  return typeof resolved === 'string' ? resolved : undefined;
}

export function translate(catalog: Messages, key: string, params?: Params): string {
  const resolved = resolveMessage(catalog, key);
  if (!resolved) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[i18n] missing message key: ${key}`);
    }
    return key;
  }
  if (!params) return resolved;

  return Object.entries(params).reduce(
    (str, [name, value]) => str.replaceAll(`{${name}}`, String(value)),
    resolved
  );
}
