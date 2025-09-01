import { BaseDomainEvent } from './DomainEvent';
import { BatchStatus, OrderingMethod } from '@/shared/types';

export class BatchCreatedEvent extends BaseDomainEvent {
  constructor(
    batchId: string,
    eventData: {
      startTime: Date;
      endTime: Date;
      orderingMethod: OrderingMethod;
    }
  ) {
    super(batchId, eventData);
  }
}

export class BatchStatusChangedEvent extends BaseDomainEvent {
  constructor(
    batchId: string,
    eventData: {
      fromStatus: BatchStatus;
      toStatus: BatchStatus;
      timestamp: Date;
    }
  ) {
    super(batchId, eventData);
  }
}

export class CommitmentAddedEvent extends BaseDomainEvent {
  constructor(
    batchId: string,
    eventData: {
      commitmentHash: string;
      userAddress: string;
      timestamp: Date;
    }
  ) {
    super(batchId, eventData);
  }
}

export class TransactionRevealedEvent extends BaseDomainEvent {
  constructor(
    batchId: string,
    eventData: {
      commitmentHash: string;
      userAddress: string;
      transactionData: string;
      revealedAt: Date;
    }
  ) {
    super(batchId, eventData);
  }
}

export class BatchFinalizedEvent extends BaseDomainEvent {
  constructor(
    batchId: string,
    eventData: {
      totalTransactions: number;
      mevExtracted: string;
      savingsGenerated: string;
      finalizedAt: Date;
    }
  ) {
    super(batchId, eventData);
  }
}

export class BatchExecutionStartedEvent extends BaseDomainEvent {
  constructor(
    batchId: string,
    eventData: {
      orderedTransactions: string[];
      executionStartedAt: Date;
    }
  ) {
    super(batchId, eventData);
  }
}

export class BatchExecutionCompletedEvent extends BaseDomainEvent {
  constructor(
    batchId: string,
    eventData: {
      successfulTransactions: number;
      failedTransactions: number;
      totalGasUsed: string;
      executionCompletedAt: Date;
    }
  ) {
    super(batchId, eventData);
  }
}


