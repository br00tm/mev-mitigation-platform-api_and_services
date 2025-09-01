import { Batch } from '../entities/Batch';
import { BatchId } from '../value-objects/BatchId';
import { BatchStatus } from '@/shared/types';

export interface IBatchRepository {
  // Basic CRUD operations
  save(batch: Batch): Promise<void>;
  findById(id: BatchId): Promise<Batch | null>;
  findByIdOrThrow(id: BatchId): Promise<Batch>;
  delete(id: BatchId): Promise<void>;
  
  // Business queries
  getCurrentActiveBatch(): Promise<Batch | null>;
  findBatchesByStatus(status: BatchStatus): Promise<Batch[]>;
  findRecentBatches(limit?: number): Promise<Batch[]>;
  findBatchesInDateRange(startDate: Date, endDate: Date): Promise<Batch[]>;
  
  // Pagination support
  findAllPaginated(
    page: number, 
    limit: number, 
    filters?: {
      status?: BatchStatus;
      orderingMethod?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<{
    batches: Batch[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }>;
  
  // Analytics queries
  getBatchStatistics(dateFrom: Date, dateTo: Date): Promise<{
    totalBatches: number;
    completedBatches: number;
    averageCommitments: number;
    averageRevealRate: number;
    totalMevExtracted: string;
    totalSavingsGenerated: string;
  }>;
  
  // Utility methods
  exists(id: BatchId): Promise<boolean>;
  countByStatus(status: BatchStatus): Promise<number>;
  findExpiredBatches(): Promise<Batch[]>;
}


