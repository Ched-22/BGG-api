const KNOWN_DIAL_CODES = ['351', '55', '34'] as const;

export type ParsedPhone = {
  countryCode: string;
  nationalNumber: string;
};

export function parseLegacyPhone(raw: string | null | undefined): ParsedPhone {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) {
    return { countryCode: '34', nationalNumber: '' };
  }

  for (const code of KNOWN_DIAL_CODES) {
    if (digits.startsWith(code) && digits.length > code.length + 7) {
      return { countryCode: code, nationalNumber: digits.slice(code.length) };
    }
  }

  if (digits.length >= 10 && digits.length <= 11) {
    return { countryCode: '55', nationalNumber: digits };
  }

  return { countryCode: '34', nationalNumber: digits };
}

export function toWhatsAppDigits(
  countryCode: string,
  nationalNumber: string,
): string {
  const cc = (countryCode || '').replace(/\D/g, '');
  const nn = (nationalNumber || '').replace(/\D/g, '');
  if (!cc || !nn) return '';
  return `${cc}${nn}`;
}

export function formatPhoneE164(
  countryCode: string,
  nationalNumber: string,
): string {
  const digits = toWhatsAppDigits(countryCode, nationalNumber);
  return digits ? `+${digits}` : '';
}
