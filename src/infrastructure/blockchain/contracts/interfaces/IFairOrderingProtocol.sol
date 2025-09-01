// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IFairOrderingProtocol
 * @dev Interface for the core MEV-resistant transaction ordering protocol
 */
interface IFairOrderingProtocol {
    // Structs
    struct Batch {
        uint256 id;
        uint256 startTime;
        uint256 endTime;
        uint256 commitmentPhaseEnd;
        uint256 revealPhaseEnd;
        bytes32[] commitments;
        string[] revealedTransactions;
        OrderingMethod orderingMethod;
        BatchStatus status;
        uint256 totalCommitments;
        uint256 totalRevealed;
    }

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        uint256 gasLimit;
        uint256 gasPrice;
        uint256 nonce;
        address submitter;
    }

    // Enums
    enum OrderingMethod {
        COMMIT_REVEAL,
        THRESHOLD_DECRYPTION,
        TIME_BASED
    }

    enum BatchStatus {
        COMMITMENT_PHASE,
        REVEAL_PHASE,
        EXECUTION_PHASE,
        COMPLETED,
        CANCELLED
    }

    // Events
    event BatchCreated(
        uint256 indexed batchId,
        uint256 startTime,
        uint256 endTime,
        OrderingMethod orderingMethod
    );

    event CommitmentSubmitted(
        uint256 indexed batchId,
        address indexed user,
        bytes32 commitment,
        uint256 timestamp
    );

    event TransactionRevealed(
        uint256 indexed batchId,
        address indexed user,
        bytes32 indexed commitmentHash,
        string transactionData,
        uint256 timestamp
    );

    event BatchStatusChanged(
        uint256 indexed batchId,
        BatchStatus fromStatus,
        BatchStatus toStatus,
        uint256 timestamp
    );

    event BatchFinalized(
        uint256 indexed batchId,
        uint256 totalTransactions,
        uint256 totalGasUsed,
        uint256 timestamp
    );

    // Core functions
    function createBatch(
        uint256 startTime,
        uint256 endTime,
        uint256 commitmentDuration,
        uint256 revealDuration,
        OrderingMethod orderingMethod
    ) external returns (uint256 batchId);

    function submitCommitment(
        uint256 batchId,
        bytes32 commitment
    ) external payable;

    function revealTransaction(
        uint256 batchId,
        string calldata transactionData,
        string calldata nonce
    ) external;

    function finalizeBatch(uint256 batchId) external;

    function executeBatch(uint256 batchId, uint256[] calldata orderedIndices) external;

    // View functions
    function getCurrentBatch() external view returns (uint256);
    
    function getBatch(uint256 batchId) external view returns (Batch memory);
    
    function getUserCommitment(uint256 batchId, address user) external view returns (bytes32);
    
    function isCommitmentPhase(uint256 batchId) external view returns (bool);
    
    function isRevealPhase(uint256 batchId) external view returns (bool);
    
    function getCommitmentCount(uint256 batchId) external view returns (uint256);
    
    function getRevealedCount(uint256 batchId) external view returns (uint256);
    
    function getBatchStatus(uint256 batchId) external view returns (BatchStatus);

    // Admin functions
    function pause() external;
    function unpause() external;
    function setMinCommitmentFee(uint256 fee) external;
    function withdrawFees() external;
}



