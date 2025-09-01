import { IBatchRepository } from '@/domain/repositories/IBatchRepository';
import { IBlockchainService } from '../interfaces/IBlockchainService';
import { Commitment } from '@/domain/value-objects/Commitment';
import { Result } from '@/shared/types';
import { generateCommitmentHash, isValidEthereumAddress } from '@/shared/utils';

export interface SubmitCommitmentRequest {
  userAddress: string;
  transactionData: {
    to: string;
    value: string;
    data: string;
    gasLimit: string;
    gasPrice: string;
    nonce: number;
  };
  nonce: string;
}

export interface SubmitCommitmentResponse {
  batchId: string;
  commitmentHash: string;
  transactionHash: string;
  gasUsed: string;
}

export class SubmitCommitmentUseCase {
  constructor(
    private readonly batchRepository: IBatchRepository,
    private readonly blockchainService: IBlockchainService
  ) {}

  async execute(request: SubmitCommitmentRequest): Promise<Result<SubmitCommitmentResponse>> {
    try {
      // 1. Validate input
      const validationResult = this.validateRequest(request);
      if (validationResult.isFailure) {
        return Result.fail(validationResult.errorValue());
      }

      // 2. Get current active batch
      const batch = await this.batchRepository.getCurrentActiveBatch();
      if (!batch) {
        return Result.fail('No active batch found for commitments');
      }

      // 3. Check if user already has a commitment in this batch
      const existingCommitment = batch.getCommitmentForUser(request.userAddress);
      if (existingCommitment) {
        return Result.fail('User already has a commitment in this batch');
      }

      // 4. Generate commitment hash
      const transactionDataString = JSON.stringify(request.transactionData);
      const commitmentHash = generateCommitmentHash(transactionDataString, request.nonce);

      // 5. Create commitment value object
      const commitmentResult = Commitment.create({
        hash: commitmentHash,
        userAddress: request.userAddress,
        timestamp: new Date(),
        nonce: request.nonce,
      });

      if (commitmentResult instanceof Error) {
        return Result.fail(`Invalid commitment: ${commitmentResult.message}`);
      }

      const commitment = commitmentResult;

      // 6. Add commitment to batch (domain logic)
      const addResult = batch.addCommitment(commitment);
      if (addResult.isFailure) {
        return Result.fail(addResult.errorValue());
      }

      // 7. Submit to blockchain
      let blockchainResult;
      try {
        blockchainResult = await this.blockchainService.submitCommitment(
          batch.id.value,
          commitment
        );
      } catch (error) {
        return Result.fail(`Blockchain submission failed: ${(error as Error).message}`);
      }

      // 8. Save batch with new commitment
      await this.batchRepository.save(batch);

      // 9. Return success response
      return Result.ok({
        batchId: batch.id.value,
        commitmentHash: commitment.hash,
        transactionHash: blockchainResult.hash,
        gasUsed: blockchainResult.gasUsed,
      });

    } catch (error) {
      return Result.fail(`Failed to submit commitment: ${(error as Error).message}`);
    }
  }

  private validateRequest(request: SubmitCommitmentRequest): Result<void> {
    // Validate user address
    if (!isValidEthereumAddress(request.userAddress)) {
      return Result.fail('Invalid user address format');
    }

    // Validate transaction data
    if (!request.transactionData) {
      return Result.fail('Transaction data is required');
    }

    if (!isValidEthereumAddress(request.transactionData.to)) {
      return Result.fail('Invalid transaction recipient address');
    }

    if (!request.transactionData.value || BigInt(request.transactionData.value) < 0) {
      return Result.fail('Invalid transaction value');
    }

    if (!request.transactionData.gasLimit || BigInt(request.transactionData.gasLimit) <= 0) {
      return Result.fail('Invalid gas limit');
    }

    if (!request.transactionData.gasPrice || BigInt(request.transactionData.gasPrice) <= 0) {
      return Result.fail('Invalid gas price');
    }

    if (typeof request.transactionData.nonce !== 'number' || request.transactionData.nonce < 0) {
      return Result.fail('Invalid transaction nonce');
    }

    // Validate commitment nonce
    if (!request.nonce || request.nonce.length < 10) {
      return Result.fail('Invalid commitment nonce - must be at least 10 characters');
    }

    return Result.ok();
  }
}



