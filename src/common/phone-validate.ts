export function validatePhonePair(
  countryCode: string,
  nationalNumber: string,
): string | null {
  const cc = (countryCode || '').replace(/\D/g, '');
  const nn = (nationalNumber || '').replace(/\D/g, '');
  if (!cc) return 'Código do país é obrigatório';
  if (!nn) return 'Número de telefone é obrigatório';
  if (cc === '34' && nn.length !== 9) return 'Número espanhol deve ter 9 dígitos';
  if (cc === '351' && nn.length !== 9) return 'Número português deve ter 9 dígitos';
  if (cc === '55' && (nn.length < 10 || nn.length > 11)) {
    return 'Número brasileiro inválido';
  }
  if (nn.length < 8 || nn.length > 12) return 'Número inválido para o país selecionado';
  return null;
}

export function normalizePhonePair(
  countryCode: string,
  nationalNumber: string,
): { phoneCountryCode: string; phoneNationalNumber: string } {
  return {
    phoneCountryCode: (countryCode || '').replace(/\D/g, ''),
    phoneNationalNumber: (nationalNumber || '').replace(/\D/g, ''),
  };
}
