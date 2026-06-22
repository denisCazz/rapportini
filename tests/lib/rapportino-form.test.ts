import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  formatRapportinoValidationError,
  getRapportinoIssueStep,
  operatoreSchema,
  rapportinoFormValuesSchema,
} from '@/lib/validators/rapportino-form';

describe('rapportino form validation helpers', () => {
  it('indica lo step corretto per i campi operatore e firme', () => {
    expect(getRapportinoIssueStep(['operatore', 'qualifica'])).toBe(1);
    expect(getRapportinoIssueStep(['cliente', 'nome'])).toBe(3);
    expect(getRapportinoIssueStep(['intervento', 'marca'])).toBe(4);
    expect(getRapportinoIssueStep(['intervento', 'firmaOperatore'])).toBe(5);
  });

  it('formatta il messaggio con etichetta campo e step', () => {
    const error = operatoreSchema.safeParse({
      nome: '',
      cognome: 'Rossi',
      telefono: '333',
      email: '',
      qualifica: 'Tecnico',
    });

    expect(error.success).toBe(false);
    if (!error.success) {
      expect(formatRapportinoValidationError(error.error, 1)).toContain('Nome operatore');
      expect(formatRapportinoValidationError(error.error, 1)).toContain('step 1');
    }
  });

  it('elenca più campi mancanti nel salvataggio completo', () => {
    const error = rapportinoFormValuesSchema.safeParse({
      operatore: {
        nome: '',
        cognome: '',
        telefono: '',
        email: '',
        qualifica: '',
      },
      cliente: {
        nome: '',
        cognome: '',
        citta: '',
        telefono: '',
      },
      intervento: {
        data: '',
        ora: '',
        tipologiaIntervento: 'manutenzione_annuale',
        tipoStufa: 'pellet',
        marca: '',
        modello: '',
        motivoChiamata: '',
        presaVisioneCondizioniGaranzia: false,
        firmaClientePrivacy: '',
        firmaOperatore: '',
        firmaCliente: '',
      },
    });

    expect(error.success).toBe(false);
    if (!error.success) {
      const message = formatRapportinoValidationError(error.error);
      expect(message).toContain('Campi da verificare:');
      expect(message).toContain('Nome operatore');
    }
  });

  it('gestisce errori Zod vuoti', () => {
    expect(formatRapportinoValidationError(new z.ZodError([]))).toBe('Dati non validi');
  });
});
