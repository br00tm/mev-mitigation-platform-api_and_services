import { TransactionData } from '@/shared/types';
import { Commitment } from '@/domain/value-objects/Commitment';

export interface BlockchainTransactionResult {
  hash: string;
  blockNumber: number;
  gasUsed: string;
  status: 'success' | 'failed';
}

export interface ContractEventData {
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  args: Record<string, unknown>;
  event: string;
}

export interface BatchOnChainData {
  batchId: string;
  status: string;
  commitmentCount: number;
  startTime: number;
  endTime: number;
  orderingMethod: string;
}

export interface IBlockchainService {
  // Contract interaction methods
  submitCommitment(batchId: string, commitment: Commitment): Promise<BlockchainTransactionResult>;
  revealTransaction(batchId: string, transactionData: TransactionData, nonce: string): Promise<BlockchainTransactionResult>;
  createNewBatch(startTime: Date, endTime: Date, orderingMethod: string): Promise<BlockchainTransactionResult>;
  finalizeBatch(batchId: string, orderedTransactions: string[]): Promise<BlockchainTransactionResult>;
  
  // Query methods
  getBatchData(batchId: string): Promise<BatchOnChainData | null>;
  getCurrentActiveBatchId(): Promise<string | null>;
  getCommitmentHash(batchId: string, userAddress: string): Promise<string | null>;
  
  // Event listening
  startEventListening(): Promise<void>;
  stopEventListening(): Promise<void>;
  onCommitmentSubmitted(callback: (data: ContractEventData) => void): void;
  onTransactionRevealed(callback: (data: ContractEventData) => void): void;
  onBatchFinalized(callback: (data: ContractEventData) => void): void;
  
  // Utility methods
  isContractDeployed(contractAddress: string): Promise<boolean>;
  getBlockNumber(): Promise<number>;
  getGasPrice(): Promise<string>;
  estimateGas(transactionData: TransactionData): Promise<string>;
  
  // Account management
  getBalance(address: string): Promise<string>;
  getNonce(address: string): Promise<number>;
}


