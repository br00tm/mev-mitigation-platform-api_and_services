// Base error classes para o sistema
export abstract class DomainError extends Error {
  abstract readonly code: string;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

// Domain Errors
export class BatchNotFoundError extends DomainError {
  readonly code = 'BATCH_NOT_FOUND';
  
  constructor(batchId: string) {
    super(`Batch with id ${batchId} not found`);
  }
}

export class InvalidBatchStatusError extends DomainError {
  readonly code = 'INVALID_BATCH_STATUS';
  
  constructor(expectedStatus: string, actualStatus: string) {
    super(`Expected batch status to be ${expectedStatus}, but got ${actualStatus}`);
  }
}

export class CommitmentAlreadyExistsError extends DomainError {
  readonly code = 'COMMITMENT_ALREADY_EXISTS';
  
  constructor(userAddress: string, batchId: string) {
    super(`User ${userAddress} already has a commitment for batch ${batchId}`);
  }
}

export class InvalidCommitmentError extends DomainError {
  readonly code = 'INVALID_COMMITMENT';
  
  constructor(reason: string) {
    super(`Invalid commitment: ${reason}`);
  }
}

export class RevealPhaseNotActiveError extends DomainError {
  readonly code = 'REVEAL_PHASE_NOT_ACTIVE';
  
  constructor(batchId: string) {
    super(`Batch ${batchId} is not in reveal phase`);
  }
}

export class TransactionRevealMismatchError extends DomainError {
  readonly code = 'TRANSACTION_REVEAL_MISMATCH';
  
  constructor() {
    super('Revealed transaction does not match commitment hash');
  }
}

// Infrastructure Errors
export class BlockchainConnectionError extends Error {
  readonly code = 'BLOCKCHAIN_CONNECTION_ERROR';
  
  constructor(reason: string) {
    super(`Blockchain connection failed: ${reason}`);
    this.name = this.constructor.name;
  }
}

export class ContractInteractionError extends Error {
  readonly code = 'CONTRACT_INTERACTION_ERROR';
  
  constructor(contractName: string, method: string, reason: string) {
    super(`Failed to interact with ${contractName}.${method}: ${reason}`);
    this.name = this.constructor.name;
  }
}

export class DatabaseError extends Error {
  readonly code = 'DATABASE_ERROR';
  
  constructor(operation: string, reason: string) {
    super(`Database ${operation} failed: ${reason}`);
    this.name = this.constructor.name;
  }
}

export class CacheError extends Error {
  readonly code = 'CACHE_ERROR';
  
  constructor(operation: string, reason: string) {
    super(`Cache ${operation} failed: ${reason}`);
    this.name = this.constructor.name;
  }
}

// Application Errors
export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  
  constructor(field: string, reason: string) {
    super(`Validation failed for ${field}: ${reason}`);
    this.name = this.constructor.name;
  }
}

export class AuthenticationError extends Error {
  readonly code = 'AUTHENTICATION_ERROR';
  
  constructor(reason: string = 'Invalid authentication credentials') {
    super(reason);
    this.name = this.constructor.name;
  }
}

export class AuthorizationError extends Error {
  readonly code = 'AUTHORIZATION_ERROR';
  
  constructor(resource: string) {
    super(`Not authorized to access ${resource}`);
    this.name = this.constructor.name;
  }
}

export class RateLimitError extends Error {
  readonly code = 'RATE_LIMIT_ERROR';
  
  constructor(limit: number, window: number) {
    super(`Rate limit exceeded: ${limit} requests per ${window}ms`);
    this.name = this.constructor.name;
  }
}

// Helper function para mapear erros para status HTTP
export function getHttpStatusForError(error: Error): number {
  switch (error.constructor.name) {
    case 'BatchNotFoundError':
    case 'ValidationError':
      return 400;
    case 'AuthenticationError':
      return 401;
    case 'AuthorizationError':
      return 403;
    case 'RateLimitError':
      return 429;
    case 'BlockchainConnectionError':
    case 'ContractInteractionError':
    case 'DatabaseError':
    case 'CacheError':
      return 500;
    default:
      if (error instanceof DomainError) {
        return 400;
      }
      return 500;
  }
}
