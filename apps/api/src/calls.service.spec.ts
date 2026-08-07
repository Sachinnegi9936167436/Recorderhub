import { normalizePhoneNumber, maskPhoneNumber, formatDuration } from '@recordhub/shared';

describe('Shared Utilities & Business Logic Tests', () => {
  describe('normalizePhoneNumber (E.164)', () => {
    it('should format 10-digit Indian numbers with +91 country code', () => {
      expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
    });

    it('should handle numbers already starting with 91', () => {
      expect(normalizePhoneNumber('919876543210')).toBe('+919876543210');
    });

    it('should preserve existing + prefixed international numbers', () => {
      expect(normalizePhoneNumber('+971501234567')).toBe('+971501234567');
    });
  });

  describe('maskPhoneNumber (PII Protection)', () => {
    it('should mask middle digits of phone number for safe role viewing', () => {
      const masked = maskPhoneNumber('+919876543210');
      expect(masked).toContain('******');
      expect(masked.endsWith('3210')).toBe(true);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds into MM:SS correctly', () => {
      expect(formatDuration(245)).toBe('04:05');
      expect(formatDuration(384)).toBe('06:24');
    });

    it('should format seconds over 1 hour into HH:MM:SS', () => {
      expect(formatDuration(3665)).toBe('01:01:05');
    });
  });
});
