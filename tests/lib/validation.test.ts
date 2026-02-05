import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  clienteSchema,
  interventoSchema,
  rapportinoSchema,
  validateRequest,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const result = loginSchema.safeParse({
        username: 'admin',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty username', () => {
      const result = loginSchema.safeParse({
        username: '',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        username: 'admin',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const result = registerSchema.safeParse({
        username: 'newuser',
        password: 'password123',
        nome: 'Mario',
        cognome: 'Rossi',
        email: 'mario@example.com',
        ruolo: 'operatore',
      });
      expect(result.success).toBe(true);
    });

    it('should reject short username', () => {
      const result = registerSchema.safeParse({
        username: 'ab',
        password: 'password123',
        nome: 'Mario',
        cognome: 'Rossi',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = registerSchema.safeParse({
        username: 'newuser',
        password: '1234567',
        nome: 'Mario',
        cognome: 'Rossi',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        username: 'newuser',
        password: 'password123',
        nome: 'Mario',
        cognome: 'Rossi',
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('clienteSchema', () => {
    it('should validate correct cliente data', () => {
      const result = clienteSchema.safeParse({
        nome: 'Mario',
        cognome: 'Rossi',
        indirizzo: 'Via Roma 1',
        citta: 'Milano',
        cap: '20100',
        telefono: '0212345678',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid CAP', () => {
      const result = clienteSchema.safeParse({
        nome: 'Mario',
        cognome: 'Rossi',
        indirizzo: 'Via Roma 1',
        citta: 'Milano',
        cap: '123', // CAP troppo corto
        telefono: '0212345678',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('interventoSchema', () => {
    it('should validate correct intervento data', () => {
      const result = interventoSchema.safeParse({
        data: '2024-01-15',
        ora: '10:30',
        tipoStufa: 'pellet',
        marca: 'MCZ',
        modello: 'Star',
        tipoIntervento: 'Manutenzione ordinaria',
        descrizione: 'Pulizia e controllo generale',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid tipoStufa', () => {
      const result = interventoSchema.safeParse({
        data: '2024-01-15',
        ora: '10:30',
        tipoStufa: 'gas', // Non valido
        marca: 'MCZ',
        modello: 'Star',
        tipoIntervento: 'Manutenzione ordinaria',
        descrizione: 'Pulizia e controllo generale',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateRequest helper', () => {
    it('should return success with valid data', () => {
      const result = validateRequest(loginSchema, {
        username: 'admin',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('admin');
      }
    });

    it('should return errors with invalid data', () => {
      const result = validateRequest(loginSchema, {
        username: '',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
