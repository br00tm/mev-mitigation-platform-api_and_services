// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IFairOrderingProtocol.sol";
import "../interfaces/ICommitRevealScheme.sol";

/**
 * @title FairOrderingProtocol
 * @dev Core contract implementing MEV-resistant transaction ordering using commit-reveal scheme
 */
contract FairOrderingProtocol is IFairOrderingProtocol, Ownable, Pausable, ReentrancyGuard {
    // State variables
    uint256 public nextBatchId = 1;
    uint256 public currentBatchId = 0;
    uint256 public minCommitmentFee = 0.01 ether;
    uint256 public defaultCommitmentDuration = 30 minutes;
    uint256 public defaultRevealDuration = 15 minutes;

    mapping(uint256 => Batch) public batches;
    mapping(uint256 => mapping(address => bytes32)) public userCommitments;
    mapping(uint256 => mapping(address => string)) public revealedTransactions;
    mapping(uint256 => mapping(address => bool)) public hasUserCommitted;
    mapping(uint256 => mapping(address => bool)) public hasUserRevealed;

    // Modifiers
    modifier validBatch(uint256 batchId) {
        require(batchId > 0 && batchId < nextBatchId, "Invalid batch ID");
        _;
    }

    modifier onlyCommitmentPhase(uint256 batchId) {
        require(isCommitmentPhase(batchId), "Not in commitment phase");
        _;
    }

    modifier onlyRevealPhase(uint256 batchId) {
        require(isRevealPhase(batchId), "Not in reveal phase");
        _;
    }

    modifier onlyExecutionPhase(uint256 batchId) {
        require(
            batches[batchId].status == BatchStatus.EXECUTION_PHASE,
            "Not in execution phase"
        );
        _;
    }

    constructor() {
        // Create initial batch
        _createInitialBatch();
    }

    /**
     * @dev Creates a new batch for transaction ordering
     */
    function createBatch(
        uint256 startTime,
        uint256 endTime,
        uint256 commitmentDuration,
        uint256 revealDuration,
        OrderingMethod orderingMethod
    ) external override onlyOwner returns (uint256 batchId) {
        require(startTime >= block.timestamp, "Start time must be in future");
        require(endTime > startTime, "End time must be after start time");
        require(commitmentDuration > 0, "Invalid commitment duration");
        require(revealDuration > 0, "Invalid reveal duration");

        batchId = nextBatchId++;
        
        uint256 commitmentPhaseEnd = startTime + commitmentDuration;
        uint256 revealPhaseEnd = commitmentPhaseEnd + revealDuration;
        
        require(revealPhaseEnd <= endTime, "Phases exceed batch duration");

        batches[batchId] = Batch({
            id: batchId,
            startTime: startTime,
            endTime: endTime,
            commitmentPhaseEnd: commitmentPhaseEnd,
            revealPhaseEnd: revealPhaseEnd,
            commitments: new bytes32[](0),
            revealedTransactions: new string[](0),
            orderingMethod: orderingMethod,
            status: BatchStatus.COMMITMENT_PHASE,
            totalCommitments: 0,
            totalRevealed: 0
        });

        // Set as current batch if starting now
        if (startTime <= block.timestamp) {
            currentBatchId = batchId;
        }

        emit BatchCreated(batchId, startTime, endTime, orderingMethod);
    }

    /**
     * @dev Submits a commitment for the current batch
     */
    function submitCommitment(
        uint256 batchId,
        bytes32 commitment
    ) external payable override whenNotPaused nonReentrant validBatch(batchId) onlyCommitmentPhase(batchId) {
        require(msg.value >= minCommitmentFee, "Insufficient commitment fee");
        require(commitment != bytes32(0), "Invalid commitment");
        require(!hasUserCommitted[batchId][msg.sender], "User already committed");

        userCommitments[batchId][msg.sender] = commitment;
        hasUserCommitted[batchId][msg.sender] = true;
        
        batches[batchId].commitments.push(commitment);
        batches[batchId].totalCommitments++;

        emit CommitmentSubmitted(batchId, msg.sender, commitment, block.timestamp);
    }

    /**
     * @dev Reveals a transaction for the specified batch
     */
    function revealTransaction(
        uint256 batchId,
        string calldata transactionData,
        string calldata nonce
    ) external override whenNotPaused validBatch(batchId) onlyRevealPhase(batchId) {
        require(hasUserCommitted[batchId][msg.sender], "No commitment found");
        require(!hasUserRevealed[batchId][msg.sender], "Already revealed");

        bytes32 expectedCommitment = keccak256(abi.encodePacked(transactionData, nonce));
        require(
            userCommitments[batchId][msg.sender] == expectedCommitment,
            "Invalid reveal"
        );

        revealedTransactions[batchId][msg.sender] = transactionData;
        hasUserRevealed[batchId][msg.sender] = true;
        
        batches[batchId].revealedTransactions.push(transactionData);
        batches[batchId].totalRevealed++;

        emit TransactionRevealed(
            batchId,
            msg.sender,
            expectedCommitment,
            transactionData,
            block.timestamp
        );
    }

    /**
     * @dev Finalizes a batch and transitions to execution phase
     */
    function finalizeBatch(uint256 batchId) external override onlyOwner validBatch(batchId) {
        require(
            block.timestamp >= batches[batchId].revealPhaseEnd,
            "Reveal phase not ended"
        );
        require(
            batches[batchId].status == BatchStatus.REVEAL_PHASE ||
            batches[batchId].status == BatchStatus.COMMITMENT_PHASE,
            "Invalid batch status"
        );

        BatchStatus oldStatus = batches[batchId].status;
        batches[batchId].status = BatchStatus.EXECUTION_PHASE;

        emit BatchStatusChanged(batchId, oldStatus, BatchStatus.EXECUTION_PHASE, block.timestamp);
    }

    /**
     * @dev Executes a batch with ordered transactions
     */
    function executeBatch(
        uint256 batchId,
        uint256[] calldata orderedIndices
    ) external override onlyOwner validBatch(batchId) onlyExecutionPhase(batchId) {
        require(
            orderedIndices.length == batches[batchId].totalRevealed,
            "Invalid order length"
        );

        // Mark batch as completed
        batches[batchId].status = BatchStatus.COMPLETED;

        emit BatchFinalized(
            batchId,
            batches[batchId].totalRevealed,
            0, // Gas used calculation would be implemented here
            block.timestamp
        );

        // Create next batch automatically
        _createNextBatch();
    }

    // View functions
    function getCurrentBatch() external view override returns (uint256) {
        return currentBatchId;
    }

    function getBatch(uint256 batchId) external view override returns (Batch memory) {
        return batches[batchId];
    }

    function getUserCommitment(
        uint256 batchId,
        address user
    ) external view override returns (bytes32) {
        return userCommitments[batchId][user];
    }

    function isCommitmentPhase(uint256 batchId) public view override returns (bool) {
        if (batchId == 0 || batchId >= nextBatchId) return false;
        
        Batch memory batch = batches[batchId];
        return batch.status == BatchStatus.COMMITMENT_PHASE &&
               block.timestamp >= batch.startTime &&
               block.timestamp < batch.commitmentPhaseEnd;
    }

    function isRevealPhase(uint256 batchId) public view override returns (bool) {
        if (batchId == 0 || batchId >= nextBatchId) return false;
        
        Batch memory batch = batches[batchId];
        return (batch.status == BatchStatus.REVEAL_PHASE ||
                (batch.status == BatchStatus.COMMITMENT_PHASE && 
                 block.timestamp >= batch.commitmentPhaseEnd)) &&
               block.timestamp < batch.revealPhaseEnd;
    }

    function getCommitmentCount(uint256 batchId) external view override returns (uint256) {
        return batches[batchId].totalCommitments;
    }

    function getRevealedCount(uint256 batchId) external view override returns (uint256) {
        return batches[batchId].totalRevealed;
    }

    function getBatchStatus(uint256 batchId) external view override returns (BatchStatus) {
        return batches[batchId].status;
    }

    // Admin functions
    function pause() external override onlyOwner {
        _pause();
    }

    function unpause() external override onlyOwner {
        _unpause();
    }

    function setMinCommitmentFee(uint256 fee) external override onlyOwner {
        minCommitmentFee = fee;
    }

    function withdrawFees() external override onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        payable(owner()).transfer(balance);
    }

    // Internal functions
    function _createInitialBatch() internal {
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + 1 hours;
        
        this.createBatch(
            startTime,
            endTime,
            defaultCommitmentDuration,
            defaultRevealDuration,
            OrderingMethod.COMMIT_REVEAL
        );
    }

    function _createNextBatch() internal {
        uint256 startTime = block.timestamp + 5 minutes; // Grace period
        uint256 endTime = startTime + 1 hours;
        
        uint256 newBatchId = nextBatchId++;
        
        uint256 commitmentPhaseEnd = startTime + defaultCommitmentDuration;
        uint256 revealPhaseEnd = commitmentPhaseEnd + defaultRevealDuration;

        batches[newBatchId] = Batch({
            id: newBatchId,
            startTime: startTime,
            endTime: endTime,
            commitmentPhaseEnd: commitmentPhaseEnd,
            revealPhaseEnd: revealPhaseEnd,
            commitments: new bytes32[](0),
            revealedTransactions: new string[](0),
            orderingMethod: OrderingMethod.COMMIT_REVEAL,
            status: BatchStatus.COMMITMENT_PHASE,
            totalCommitments: 0,
            totalRevealed: 0
        });

        currentBatchId = newBatchId;

        emit BatchCreated(newBatchId, startTime, endTime, OrderingMethod.COMMIT_REVEAL);
    }

    /**
     * @dev Updates batch status based on current time
     */
    function updateBatchStatus(uint256 batchId) external validBatch(batchId) {
        Batch storage batch = batches[batchId];
        
        if (batch.status == BatchStatus.COMMITMENT_PHASE && 
            block.timestamp >= batch.commitmentPhaseEnd) {
            batch.status = BatchStatus.REVEAL_PHASE;
            emit BatchStatusChanged(batchId, BatchStatus.COMMITMENT_PHASE, BatchStatus.REVEAL_PHASE, block.timestamp);
        }
    }
}




