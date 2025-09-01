// Tipos base para o sistema
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos do domínio MEV
export interface TransactionData {
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
}

export interface Commitment {
  hash: string;
  timestamp: Date;
  userAddress: string;
  batchId: string;
}

export interface BatchMetrics {
  totalTransactions: number;
  mevExtracted: string;
  savingsGenerated: string;
  efficiency: number;
}

// Enums
export enum BatchStatus {
  COMMITMENT_PHASE = 'COMMITMENT_PHASE',
  REVEAL_PHASE = 'REVEAL_PHASE',
  EXECUTION_PHASE = 'EXECUTION_PHASE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum OrderingMethod {
  COMMIT_REVEAL = 'COMMIT_REVEAL',
  THRESHOLD_DECRYPTION = 'THRESHOLD_DECRYPTION',
  TIME_BASED = 'TIME_BASED'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMMITTED = 'COMMITTED',
  REVEALED = 'REVEALED',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED'
}

// Result type para controle de erros
export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public error?: string;
  private _value?: T;

  private constructor(isSuccess: boolean, error?: string, value?: T) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error');
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs to contain an error message');
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error;
    this._value = value;

    Object.freeze(this);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error('Cannot get the value of an error result. Use "errorValue" instead.');
    }

    return this._value as T;
  }

  public errorValue(): string {
    return this.error as string;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, undefined, value);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error);
  }
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Environment variables type
export interface EnvConfig {
  NODE_ENV: string;
  API_PORT: number;
  API_HOST: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  SEPOLIA_RPC_URL: string;
  PRIVATE_KEY: string;
  ETHERSCAN_API_KEY: string;
  FAIR_ORDERING_CONTRACT_ADDRESS?: string;
  COMMIT_REVEAL_CONTRACT_ADDRESS?: string;
  THRESHOLD_DECRYPTION_CONTRACT_ADDRESS?: string;
}


