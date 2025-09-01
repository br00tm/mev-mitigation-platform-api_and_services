// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ICommitRevealScheme
 * @dev Interface for commit-reveal pattern implementation
 */
interface ICommitRevealScheme {
    // Events
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

    event RevealPhaseStarted(
        uint256 indexed batchId,
        uint256 timestamp
    );

    event CommitmentExpired(
        uint256 indexed batchId,
        address indexed user,
        bytes32 commitment
    );

    // Core commit-reveal functions
    function commit(
        uint256 batchId,
        bytes32 hashedTransaction
    ) external payable;

    function reveal(
        uint256 batchId,
        string calldata transaction,
        string calldata nonce
    ) external;

    function batchReveal(
        uint256 batchId,
        string[] calldata transactions,
        string[] calldata nonces
    ) external;

    // View functions
    function getCommitment(
        uint256 batchId,
        address user
    ) external view returns (bytes32);

    function isCommitmentPhase(uint256 batchId) external view returns (bool);

    function isRevealPhase(uint256 batchId) external view returns (bool);

    function hasCommitted(
        uint256 batchId,
        address user
    ) external view returns (bool);

    function hasRevealed(
        uint256 batchId,
        address user
    ) external view returns (bool);

    function getRevealedTransaction(
        uint256 batchId,
        address user
    ) external view returns (string memory);

    function verifyCommitment(
        bytes32 commitment,
        string calldata transaction,
        string calldata nonce
    ) external pure returns (bool);

    function generateCommitmentHash(
        string calldata transaction,
        string calldata nonce
    ) external pure returns (bytes32);

    // Admin functions
    function setMinCommitmentFee(uint256 fee) external;
    
    function setCommitmentTimeout(uint256 timeout) external;
    
    function cleanupExpiredCommitments(uint256 batchId, address[] calldata users) external;
}



