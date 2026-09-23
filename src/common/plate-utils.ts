export const PLATE_COUNTRY_CODES = ['ES', 'PT', 'BR', 'FR', 'DE', 'UK', 'OTHER'] as const;

export type PlateCountryCode = (typeof PLATE_COUNTRY_CODES)[number];

const DEFAULT_PLATE_COUNTRY: PlateCountryCode = 'ES';

type PlateCountryConfig = {
  label: string;
  placeholder: string;
  maxLength: number;
  validate: (normalized: string) => boolean;
  formatDisplay: (normalized: string) => string;
  formatInput: (value: string) => string;
};

function stripPlate(value: string, allowed: RegExp): string {
  return (value || '')
    .toUpperCase()
    .split('')
    .filter((ch) => allowed.test(ch))
    .join('');
}

function formatGrouped(raw: string, groups: number[], separator: string): string {
  const parts: string[] = [];
  let offset = 0;
  for (const size of groups) {
    if (offset >= raw.length) break;
    parts.push(raw.slice(offset, offset + size));
    offset += size;
  }
  return parts.join(separator);
}

const PLATE_COUNTRY_CONFIG: Record<PlateCountryCode, PlateCountryConfig> = {
  ES: {
    label: 'Espanha',
    placeholder: '1234 BCD',
    maxLength: 7,
    validate: (n) => /^[0-9]{4}[A-Z]{3}$/.test(n),
    formatDisplay: (n) => (n.length <= 4 ? n : `${n.slice(0, 4)} ${n.slice(4)}`),
    formatInput: (value) => {
      const raw = stripPlate(value, /[A-Z0-9]/).slice(0, 7);
      return raw.length <= 4 ? raw : `${raw.slice(0, 4)} ${raw.slice(4)}`;
    },
  },
  PT: {
    label: 'Portugal',
    placeholder: 'AA-00-AA',
    maxLength: 6,
    validate: (n) => /^[A-Z]{2}[0-9]{2}[A-Z]{2}$/.test(n),
    formatDisplay: (n) => formatGrouped(n, [2, 2, 2], '-'),
    formatInput: (value) => {
      const raw = stripPlate(value, /[A-Z0-9]/).slice(0, 6);
      return formatGrouped(raw, [2, 2, 2], '-');
    },
  },
  BR: {
    label: 'Brasil',
    placeholder: 'ABC1D23',
    maxLength: 7,
    validate: (n) =>
      /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(n) || /^[A-Z]{3}[0-9]{4}$/.test(n),
    formatDisplay: (n) => n,
    formatInput: (value) => stripPlate(value, /[A-Z0-9]/).slice(0, 7),
  },
  FR: {
    label: 'França',
    placeholder: 'AB-123-CD',
    maxLength: 7,
    validate: (n) => /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(n),
    formatDisplay: (n) => formatGrouped(n, [2, 3, 2], '-'),
    formatInput: (value) => {
      const raw = stripPlate(value, /[A-Z0-9]/).slice(0, 7);
      return formatGrouped(raw, [2, 3, 2], '-');
    },
  },
  DE: {
    label: 'Alemanha',
    placeholder: 'B AB 1234',
    maxLength: 9,
    validate: (n) => /^[A-Z]{1,3}[A-Z]{0,2}[0-9]{1,4}[A-Z]{0,2}$/.test(n),
    formatDisplay: (n) => n,
    formatInput: (value) => stripPlate(value, /[A-Z0-9]/).slice(0, 9),
  },
  UK: {
    label: 'Reino Unido',
    placeholder: 'AB12 CDE',
    maxLength: 7,
    validate: (n) => /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/.test(n),
    formatDisplay: (n) => (n.length <= 4 ? n : `${n.slice(0, 4)} ${n.slice(4)}`),
    formatInput: (value) => {
      const raw = stripPlate(value, /[A-Z0-9]/).slice(0, 7);
      return raw.length <= 4 ? raw : `${raw.slice(0, 4)} ${raw.slice(4)}`;
    },
  },
  OTHER: {
    label: 'Outro',
    placeholder: 'Matrícula',
    maxLength: 10,
    validate: (n) => /^[A-Z0-9]{4,10}$/.test(n),
    formatDisplay: (n) => n,
    formatInput: (value) => stripPlate(value, /[A-Z0-9]/).slice(0, 10),
  },
};

export function isPlateCountryCode(value: string): value is PlateCountryCode {
  return PLATE_COUNTRY_CODES.includes(value as PlateCountryCode);
}

export function resolvePlateCountry(value?: string | null): PlateCountryCode {
  if (value && isPlateCountryCode(value)) return value;
  return DEFAULT_PLATE_COUNTRY;
}

export function getPlateCountryOptions() {
  return PLATE_COUNTRY_CODES.map((code) => ({
    code,
    label: PLATE_COUNTRY_CONFIG[code].label,
    placeholder: PLATE_COUNTRY_CONFIG[code].placeholder,
  }));
}

export function getPlatePlaceholder(country?: string | null): string {
  return PLATE_COUNTRY_CONFIG[resolvePlateCountry(country)].placeholder;
}

export function normalizePlate(value: string, country?: string | null): string {
  return stripPlate(value, /[A-Z0-9]/);
}

export function validatePlate(value: string, country?: string | null): boolean {
  const normalized = normalizePlate(value, country);
  if (!normalized) return false;
  return PLATE_COUNTRY_CONFIG[resolvePlateCountry(country)].validate(normalized);
}

export function formatPlateDisplay(
  value: string,
  country?: string | null,
): string {
  const normalized = normalizePlate(value, country);
  if (!normalized) return '';
  return PLATE_COUNTRY_CONFIG[resolvePlateCountry(country)].formatDisplay(normalized);
}

export function formatPlateInput(value: string, country?: string | null): string {
  return PLATE_COUNTRY_CONFIG[resolvePlateCountry(country)].formatInput(value);
}

export function plateValidationMessage(country?: string | null): string {
  const resolved = resolvePlateCountry(country);
  const placeholder = PLATE_COUNTRY_CONFIG[resolved].placeholder;
  return `Placa inválida. Use o formato ${placeholder}.`;
}
