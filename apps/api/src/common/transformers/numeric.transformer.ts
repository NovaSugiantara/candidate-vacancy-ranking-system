import type { ValueTransformer } from 'typeorm';

export class NumericTransformer implements ValueTransformer {
  to(value: number | null): string | null {
    if (value === null) {
      return null;
    }
    if (!Number.isFinite(value)) {
      throw new TypeError('Numeric column values must be finite');
    }
    return value.toFixed(2);
  }

  from(value: string | null): number | null {
    if (value === null) {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new TypeError('Database numeric value must be finite');
    }
    return parsed;
  }
}

export const numericTransformer = new NumericTransformer();
