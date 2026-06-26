import { ClientPreferredLanguage } from '@prisma/client';

export const CLIENT_PREFERRED_LANGUAGES = [
  'es',
  'ca',
  'en',
  'ptBr',
  'ptPt',
] as const satisfies readonly ClientPreferredLanguage[];

export type ClientPreferredLanguageCode = (typeof CLIENT_PREFERRED_LANGUAGES)[number];

export function isClientPreferredLanguage(
  value: unknown,
): value is ClientPreferredLanguageCode {
  return (
    typeof value === 'string'
    && CLIENT_PREFERRED_LANGUAGES.includes(value as ClientPreferredLanguageCode)
  );
}

export function normalizePreferredLanguage(
  value?: string | null,
): ClientPreferredLanguage {
  return isClientPreferredLanguage(value) ? value : ClientPreferredLanguage.es;
}
