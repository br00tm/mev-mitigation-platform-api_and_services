import { AggregateRoot } from './AggregateRoot';
import { BatchId } from '../value-objects/BatchId';
import { Commitment } from '../value-objects/Commitment';
import { MEVMetrics } from '../value-objects/MEVMetrics';
import { BatchStatus, OrderingMethod, Result, TransactionData } from '@/shared/types';
import { 
  BatchCreatedEvent, 
  BatchStatusChangedEvent, 
  CommitmentAddedEvent, 
  TransactionRevealedEvent,
  BatchFinalizedEvent 
} from '../events/BatchEvents';
import { 
  InvalidBatchStatusError, 
  CommitmentAlreadyExistsError, 
  RevealPhaseNotActiveError,
  TransactionRevealMismatchError 
} from '@/shared/errors';
import { generateCommitmentHash, addMinutes, isExpired } from '@/shared/utils';

export interface CreateBatchParams {
  startTime: Date;
  endTime: Date;
  orderingMethod: OrderingMethod;
  commitmentDurationMinutes?: number;
  revealDurationMinutes?: number;
}

export interface RevealedTransaction {
  commitmentHash: string;
  transactionData: TransactionData;
  userAddress: string;
  revealedAt: Date;
  nonce: string;
}

export class Batch extends AggregateRoot {
  private readonly _id: BatchId;
  private readonly _startTime: Date;
  private readonly _endTime: Date;
  private readonly _orderingMethod: OrderingMethod;
  private readonly _commitmentPhaseEnd: Date;
  private readonly _revealPhaseEnd: Date;
  
  private _status: BatchStatus;
  private _commitments: Map<string, Commitment>; // userAddress -> Commitment
  private _revealedTransactions: Map<string, RevealedTransaction>; // commitmentHash -> RevealedTransaction
  private _finalOrderedTransactions: string[];
  private _metrics?: MEVMetrics;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(params: {
    id: BatchId;
    startTime: Date;
    endTime: Date;
    orderingMethod: OrderingMethod;
    commitmentPhaseEnd: Date;
    revealPhaseEnd: Date;
    status?: BatchStatus;
    commitments?: Commitment[];
    revealedTransactions?: RevealedTransaction[];
    finalOrderedTransactions?: string[];
    metrics?: MEVMetrics;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super();
    
    this._id = params.id;
    this._startTime = params.startTime;
    this._endTime = params.endTime;
    this._orderingMethod = params.orderingMethod;
    this._commitmentPhaseEnd = params.commitmentPhaseEnd;
    this._revealPhaseEnd = params.revealPhaseEnd;
    this._status = params.status ?? BatchStatus.COMMITMENT_PHASE;
    this._finalOrderedTransactions = params.finalOrderedTransactions ?? [];
    this._metrics = params.metrics;
    this._createdAt = params.createdAt ?? new Date();
    this._updatedAt = params.updatedAt ?? new Date();

    // Initialize maps
    this._commitments = new Map();
    this._revealedTransactions = new Map();

    // Populate commitments if provided
    if (params.commitments) {
      params.commitments.forEach(commitment => {
        this._commitments.set(commitment.userAddress, commitment);
      });
    }

    // Populate revealed transactions if provided
    if (params.revealedTransactions) {
      params.revealedTransactions.forEach(tx => {
        this._revealedTransactions.set(tx.commitmentHash, tx);
      });
    }
  }

  public static create(params: CreateBatchParams): Result<Batch> {
    try {
      // Validations
      if (params.endTime <= params.startTime) {
        return Result.fail('End time must be after start time');
      }

      if (params.startTime < new Date()) {
        return Result.fail('Start time cannot be in the past');
      }

      const commitmentDuration = params.commitmentDurationMinutes ?? 30;
      const revealDuration = params.revealDurationMinutes ?? 15;

      const commitmentPhaseEnd = addMinutes(params.startTime, commitmentDuration);
      const revealPhaseEnd = addMinutes(commitmentPhaseEnd, revealDuration);

      if (revealPhaseEnd > params.endTime) {
        return Result.fail('Batch duration is too short for commitment and reveal phases');
      }

      const batchId = BatchId.create();
      
      const batch = new Batch({
        id: batchId,
        startTime: params.startTime,
        endTime: params.endTime,
        orderingMethod: params.orderingMethod,
        commitmentPhaseEnd,
        revealPhaseEnd,
      });

      batch.addDomainEvent(new BatchCreatedEvent(batchId.value, {
        startTime: params.startTime,
        endTime: params.endTime,
        orderingMethod: params.orderingMethod,
      }));

      return Result.ok(batch);
    } catch (error) {
      return Result.fail(`Failed to create batch: ${(error as Error).message}`);
    }
  }

  public static fromPersistence(data: {
    id: string;
    startTime: Date;
    endTime: Date;
    orderingMethod: OrderingMethod;
    commitmentPhaseEnd: Date;
    revealPhaseEnd: Date;
    status: BatchStatus;
    commitments?: Commitment[];
    revealedTransactions?: RevealedTransaction[];
    finalOrderedTransactions?: string[];
    metrics?: MEVMetrics;
    createdAt: Date;
    updatedAt: Date;
  }): Batch {
    return new Batch({
      id: BatchId.fromString(data.id),
      startTime: data.startTime,
      endTime: data.endTime,
      orderingMethod: data.orderingMethod,
      commitmentPhaseEnd: data.commitmentPhaseEnd,
      revealPhaseEnd: data.revealPhaseEnd,
      status: data.status,
      commitments: data.commitments,
      revealedTransactions: data.revealedTransactions,
      finalOrderedTransactions: data.finalOrderedTransactions,
      metrics: data.metrics,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  // Getters
  public get id(): BatchId {
    return this._id;
  }

  public get startTime(): Date {
    return this._startTime;
  }

  public get endTime(): Date {
    return this._endTime;
  }

  public get orderingMethod(): OrderingMethod {
    return this._orderingMethod;
  }

  public get status(): BatchStatus {
    return this._status;
  }

  public get commitmentPhaseEnd(): Date {
    return this._commitmentPhaseEnd;
  }

  public get revealPhaseEnd(): Date {
    return this._revealPhaseEnd;
  }

  public get commitments(): Commitment[] {
    return Array.from(this._commitments.values());
  }

  public get revealedTransactions(): RevealedTransaction[] {
    return Array.from(this._revealedTransactions.values());
  }

  public get finalOrderedTransactions(): string[] {
    return [...this._finalOrderedTransactions];
  }

  public get metrics(): MEVMetrics | undefined {
    return this._metrics;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business methods
  public addCommitment(commitment: Commitment): Result<void> {
    try {
      if (!this.isInCommitmentPhase()) {
        return Result.fail('Batch is not in commitment phase');
      }

      if (this._commitments.has(commitment.userAddress)) {
        throw new CommitmentAlreadyExistsError(commitment.userAddress, this._id.value);
      }

      this._commitments.set(commitment.userAddress, commitment);
      this._updatedAt = new Date();

      this.addDomainEvent(new CommitmentAddedEvent(this._id.value, {
        commitmentHash: commitment.hash,
        userAddress: commitment.userAddress,
        timestamp: commitment.timestamp,
      }));

      return Result.ok();
    } catch (error) {
      if (error instanceof CommitmentAlreadyExistsError) {
        return Result.fail(error.message);
      }
      return Result.fail(`Failed to add commitment: ${(error as Error).message}`);
    }
  }

  public revealTransaction(
    commitmentHash: string,
    transactionData: TransactionData,
    userAddress: string,
    nonce: string
  ): Result<void> {
    try {
      if (!this.isInRevealPhase()) {
        throw new RevealPhaseNotActiveError(this._id.value);
      }

      // Verify commitment exists for this user
      const commitment = this._commitments.get(userAddress);
      if (!commitment || commitment.hash !== commitmentHash) {
        return Result.fail('No matching commitment found for user');
      }

      // Verify revealed transaction matches commitment
      const expectedHash = generateCommitmentHash(JSON.stringify(transactionData), nonce);
      if (expectedHash !== commitmentHash) {
        throw new TransactionRevealMismatchError();
      }

      const revealedTransaction: RevealedTransaction = {
        commitmentHash,
        transactionData,
        userAddress,
        revealedAt: new Date(),
        nonce,
      };

      this._revealedTransactions.set(commitmentHash, revealedTransaction);
      this._updatedAt = new Date();

      this.addDomainEvent(new TransactionRevealedEvent(this._id.value, {
        commitmentHash,
        userAddress,
        transactionData: JSON.stringify(transactionData),
        revealedAt: revealedTransaction.revealedAt,
      }));

      return Result.ok();
    } catch (error) {
      if (error instanceof RevealPhaseNotActiveError || error instanceof TransactionRevealMismatchError) {
        return Result.fail(error.message);
      }
      return Result.fail(`Failed to reveal transaction: ${(error as Error).message}`);
    }
  }

  public transitionToRevealPhase(): Result<void> {
    if (this._status !== BatchStatus.COMMITMENT_PHASE) {
      throw new InvalidBatchStatusError(BatchStatus.COMMITMENT_PHASE, this._status);
    }

    const oldStatus = this._status;
    this._status = BatchStatus.REVEAL_PHASE;
    this._updatedAt = new Date();

    this.addDomainEvent(new BatchStatusChangedEvent(this._id.value, {
      fromStatus: oldStatus,
      toStatus: this._status,
      timestamp: new Date(),
    }));

    return Result.ok();
  }

  public transitionToExecutionPhase(): Result<void> {
    if (this._status !== BatchStatus.REVEAL_PHASE) {
      throw new InvalidBatchStatusError(BatchStatus.REVEAL_PHASE, this._status);
    }

    const oldStatus = this._status;
    this._status = BatchStatus.EXECUTION_PHASE;
    this._updatedAt = new Date();

    this.addDomainEvent(new BatchStatusChangedEvent(this._id.value, {
      fromStatus: oldStatus,
      toStatus: this._status,
      timestamp: new Date(),
    }));

    return Result.ok();
  }

  public finalizeBatch(orderedTransactions: string[], metrics: MEVMetrics): Result<void> {
    if (this._status !== BatchStatus.EXECUTION_PHASE) {
      throw new InvalidBatchStatusError(BatchStatus.EXECUTION_PHASE, this._status);
    }

    this._finalOrderedTransactions = [...orderedTransactions];
    this._metrics = metrics;
    this._status = BatchStatus.COMPLETED;
    this._updatedAt = new Date();

    this.addDomainEvent(new BatchFinalizedEvent(this._id.value, {
      totalTransactions: metrics.totalTransactions,
      mevExtracted: metrics.extractedValue,
      savingsGenerated: metrics.savingsGenerated,
      finalizedAt: new Date(),
    }));

    return Result.ok();
  }

  // Status checks
  public isInCommitmentPhase(): boolean {
    return this._status === BatchStatus.COMMITMENT_PHASE && !isExpired(this._commitmentPhaseEnd);
  }

  public isInRevealPhase(): boolean {
    return this._status === BatchStatus.REVEAL_PHASE && !isExpired(this._revealPhaseEnd);
  }

  public isInExecutionPhase(): boolean {
    return this._status === BatchStatus.EXECUTION_PHASE;
  }

  public isCompleted(): boolean {
    return this._status === BatchStatus.COMPLETED;
  }

  public isExpired(): boolean {
    return isExpired(this._endTime);
  }

  public getCommitmentForUser(userAddress: string): Commitment | undefined {
    return this._commitments.get(userAddress);
  }

  public getRevealedTransactionByHash(commitmentHash: string): RevealedTransaction | undefined {
    return this._revealedTransactions.get(commitmentHash);
  }

  public getCommitmentCount(): number {
    return this._commitments.size;
  }

  public getRevealedTransactionCount(): number {
    return this._revealedTransactions.size;
  }

  public getRevealRate(): number {
    if (this._commitments.size === 0) return 0;
    return (this._revealedTransactions.size / this._commitments.size) * 100;
  }
}




