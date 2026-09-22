import type { ValueTransformer } from 'typeorm';

export class NumericTransformer implements ValueTransformer {
  // undefined matters as much as null: a criterion that carries no salary range
  // simply never assigns these fields, so they reach the driver as undefined.
  to(value: number | null | undefined): string | null {
    if (value === null || value === undefined) {
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
