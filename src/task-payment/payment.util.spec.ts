import {
  derivePaymentStatus,
  readOrcamentoAmounts,
} from './payment.util';

describe('payment.util', () => {
  it('reads orcamento saldo from valor and deposito', () => {
    expect(readOrcamentoAmounts({ valor: 500, deposito: 100 })).toEqual({
      valor: 500,
      deposito: 100,
      saldo: 400,
    });
  });

  it('derives pending by default', () => {
    expect(derivePaymentStatus(null)).toBe('pending');
    expect(derivePaymentStatus({
      settlementStatus: 'pending',
      isInstallment: false,
      installmentCount: null,
      installmentsPaid: 0,
    })).toBe('pending');
  });

  it('derives installments open', () => {
    expect(derivePaymentStatus({
      settlementStatus: 'paid',
      isInstallment: true,
      installmentCount: 3,
      installmentsPaid: 1,
    })).toBe('installmentsOpen');
  });

  it('derives completed for prepaid and full payment', () => {
    expect(derivePaymentStatus({
      settlementStatus: 'prepaid',
      isInstallment: false,
      installmentCount: null,
      installmentsPaid: 0,
    })).toBe('completed');
    expect(derivePaymentStatus({
      settlementStatus: 'paid',
      isInstallment: true,
      installmentCount: 3,
      installmentsPaid: 3,
    })).toBe('completed');
  });
});
