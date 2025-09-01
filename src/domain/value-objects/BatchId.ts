import { generateId, isValidUuid } from '@/shared/utils';

export class BatchId {
  private readonly _value: string;

  private constructor(value: string) {
    if (!isValidUuid(value)) {
      throw new Error('Invalid BatchId format');
    }
    this._value = value;
  }

  public static create(id?: string): BatchId {
    return new BatchId(id ?? generateId());
  }

  public static fromString(id: string): BatchId {
    return new BatchId(id);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: BatchId): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}


