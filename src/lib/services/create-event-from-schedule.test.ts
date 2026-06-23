import { describe, it, expect } from 'vitest';
import { computeNextOccurrence } from './create-event-from-schedule';

describe('computeNextOccurrence', () => {
  // Helper: crear un Date en UTC desde string ISO
  const utc = (s: string) => new Date(s);

  it('mismo día, hora no pasada — schedule para hoy', () => {
    // Viernes 19 Jun 2026, 20:00 Argentina = 23:00 UTC
    // Schedule: viernes (5) 22:00 → aún no pasó → evento HOY
    const now = utc('2026-06-19T23:00:00Z'); // 20:00 Arg
    const result = computeNextOccurrence(5, '22:00', now);
    // Esperado: viernes 22:00 Arg = sábado 01:00 UTC
    expect(result.date.toISOString()).toBe('2026-06-20T01:00:00.000Z');
    expect(result.daysUntilEvent).toBeCloseTo(2 / 24, 3); // ~2h
  });

  it('mismo día, hora pasada — schedule para próxima semana', () => {
    // Viernes 19 Jun 2026, 23:00 Argentina = sábado 02:00 UTC
    // Schedule: viernes (5) 22:00 → ya pasó → próximo viernes
    const now = utc('2026-06-20T02:00:00Z'); // 23:00 Arg
    const result = computeNextOccurrence(5, '22:00', now);
    // Esperado: próximo viernes 26 Jun 22:00 Arg = sábado 27 Jun 01:00 UTC
    expect(result.date.toISOString()).toBe('2026-06-27T01:00:00.000Z');
    expect(result.daysUntilEvent).toBeCloseTo(7 - 1 / 24, 2); // ~7 días - 1h
  });

  it('BUG: 10pm+ Argentina, UTC distinto día — encuentra HOY, no próx semana', () => {
    // ⚠️ ESTE ES EL BUG QUE ARREGLE: con la versión anterior,
    //    now.getUTCDay() devolvía sábado (6) y daysUntil = 6 → próx semana.
    //
    // Viernes 19 Jun 2026, 22:00 Argentina = Sábado 20 Jun 01:00 UTC
    // getUTCDay() en now → 6 (sábado) pero day_of_week=5 (viernes) → daysUntil = 6
    //
    // Con el fix: convertimos now a Argentina primero → getUTCDay = 5 (viernes) → daysUntil = 0
    const now = utc('2026-06-20T01:00:00Z'); // 22:00 Arg (viernes)
    const result = computeNextOccurrence(5, '22:00', now);
    // Debe encontrar HOY (no próx semana)
    expect(result.date.toISOString()).toBe('2026-06-20T01:00:00.000Z');
    // daysUntilEvent ≈ 0 (el evento es ahora)
    expect(result.daysUntilEvent).toBeCloseTo(0, 3);
  });

  it('día distinto, dentro de days_ahead', () => {
    // Viernes 19 Jun 2026, 10:00 Argentina = 13:00 UTC
    // Schedule: lunes (1) 20:00 → próximo lunes 22 Jun
    const now = utc('2026-06-19T13:00:00Z'); // 10:00 Arg
    const result = computeNextOccurrence(1, '20:00', now);
    // Lunes 22 Jun 20:00 Arg = Lunes 22 Jun 23:00 UTC
    expect(result.date.toISOString()).toBe('2026-06-22T23:00:00.000Z');
    // daysUntilEvent ≈ 3.4 días
    expect(result.daysUntilEvent).toBeGreaterThan(3);
    expect(result.daysUntilEvent).toBeLessThan(4);
  });

  it('día lejano, fuera de days_ahead', () => {
    // Viernes 19 Jun 2026, 10:00 Argentina
    // Schedule: jueves (4) 22:00 → próx jueves 25 Jun (6 días)
    const now = utc('2026-06-19T13:00:00Z');
    const result = computeNextOccurrence(4, '22:00', now);
    // Jueves 25 Jun 22:00 Arg = Viernes 26 Jun 01:00 UTC
    expect(result.date.toISOString()).toBe('2026-06-26T01:00:00.000Z');
    expect(result.daysUntilEvent).toBeCloseTo(6.5, 0); // ~6.5 días
  });

  it('medianoche Argentina (0:00) — no extraDays erroneo', () => {
    // Domingo 21 Jun 2026, 23:00 Argentina = Lunes 22 Jun 02:00 UTC
    // Schedule: lunes (1) 00:00 → próximo lunes
    const now = utc('2026-06-22T02:00:00Z'); // 23:00 Arg domingo
    const result = computeNextOccurrence(1, '00:00', now);
    // Lunes 00:00 Arg = Lunes 03:00 UTC (0+3=3, no overflow)
    // Hoy es domingo, así que el próximo lunes es mañana
    expect(result.date.toISOString()).toBe('2026-06-22T03:00:00.000Z');
    expect(result.daysUntilEvent).toBeCloseTo(1 / 24, 3); // ~1h
  });

  it('schedule tarde-noche Argentina (23:00) — UTC día siguiente', () => {
    // Sábado 20 Jun 2026, 12:00 Argentina = 15:00 UTC
    // Schedule: sábado (6) 23:00 → hoy, aún no pasó
    const now = utc('2026-06-20T15:00:00Z'); // 12:00 Arg
    const result = computeNextOccurrence(6, '23:00', now);
    // Sábado 23:00 Arg = Domingo 02:00 UTC
    expect(result.date.toISOString()).toBe('2026-06-21T02:00:00.000Z');
  });

  it('schedule madrugada Argentina (01:00) — mismo día UTC', () => {
    // Sábado 20 Jun 2026, 12:00 Argentina = 15:00 UTC
    // Schedule: sábado (6) 01:00 → hoy, ya pasó → próx sábado
    const now = utc('2026-06-20T15:00:00Z'); // 12:00 Arg
    const result = computeNextOccurrence(6, '01:00', now);
    // Ya pasó (01:00 < 12:00) → próximo sábado 27 Jun 01:00 Arg = 04:00 UTC
    expect(result.date.toISOString()).toBe('2026-06-27T04:00:00.000Z');
  });
});
