// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title FederatedTrainingReward
 * @notice Trustless escrow and reward distribution for decentralised federated learning.
 *
 * Security fixes applied (ref: v2_Security_Audit.md):
 *   C1 — setPendingWithdrawal restricted to onlyOwner (was public, allowed arbitrary drain).
 *   C2 — Whitelist check restored in submitWeights (was removed for testing).
 */
contract FederatedTrainingReward {
    uint256 public taskCount;
    uint256 public count = 0;
    address public owner;

    mapping(uint256 => string[]) public taskWeights;

    /// @notice Whitelist of trainer accounts authorised to submit weights and earn rewards.
    mapping(address => bool) public whitelist;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not contract owner");
        _;
    }

    // ── Whitelist management (owner only) ──────────────────────────────────────

    /// @dev Emitted whenever an account's whitelist status changes.
    event Whitelisted(address indexed account, bool status);

    /// @notice Add a trainer account to the whitelist.
    /// @param _account EVM address of the trainer (convert Hedera ID → EVM via long-zero encoding)
    function addToWhitelist(address _account) external onlyOwner {
        whitelist[_account] = true;
        emit Whitelisted(_account, true);
    }

    /// @notice Remove a trainer account from the whitelist.
    function removeFromWhitelist(address _account) external onlyOwner {
        whitelist[_account] = false;
        emit Whitelisted(_account, false);
    }

    /// @notice Check whether an account is whitelisted.
    function isWhitelisted(address _account) external view returns (bool) {
        return whitelist[_account];
    }

    // ── View helpers ───────────────────────────────────────────────────────────

    function getCount() public view returns (uint256) {
        return count;
    }

    function getTaskId() public view returns (uint256) {
        return taskCount;
    }

    function taskExists(uint256 taskId) public view returns (bool) {
        return tasks[taskId].exists;
    }

    function incrementCount() public {
        count += 1;
    }

    // ── Core data structures ───────────────────────────────────────────────────

    struct Task {
        address payable depositor;
        string modelUrl;      // IPFS/Akave URL of the model script
        string datasetUrl;    // IPFS/Akave URL of the dataset manifest
        uint256 numChunks;    // total chunks (= total expected weight submissions)
        uint256 remainingChunks;
        uint256 perChunkReward; // tinybars per chunk
        bool exists;
    }

    mapping(uint256 => Task) public tasks;
    mapping(address => uint256) public pendingWithdrawals;

    // ── Events ─────────────────────────────────────────────────────────────────

    event TaskCreated(
        uint256 indexed taskId,
        address indexed depositor,
        string modelUrl,
        string datasetUrl,
        uint256 numChunks,
        uint256 totalReward
    );

    event TaskCompleted(uint256 indexed taskId);

    /// @dev Emitted when a whitelisted trainer submits weights and is paid.
    event WeightsSubmitted(
        uint256 indexed taskId,
        address indexed trainer,
        string weightsHash,
        uint256 rewardAmount,
        uint256 remainingChunks
    );

    event Withdrawn(address indexed who, uint256 amount);

    // ── Core functions ─────────────────────────────────────────────────────────

    /// @notice ML user creates a training task and deposits HBAR as escrow.
    /// @param modelUrl  IPFS/Akave URL of the model script
    /// @param datasetUrl IPFS/Akave URL of the dataset manifest
    /// @param numChunks Number of dataset chunks (determines per-chunk reward)
    function createTask(
        string calldata modelUrl,
        string calldata datasetUrl,
        uint256 numChunks
    ) external payable returns (uint256) {
        require(numChunks > 0, "numChunks must be > 0");
        require(msg.value > 0, "deposit required");

        taskCount += 1;
        uint256 taskId = taskCount;

        uint256 perChunk = msg.value / numChunks;

        tasks[taskId] = Task({
            depositor: payable(msg.sender),
            modelUrl: modelUrl,
            datasetUrl: datasetUrl,
            numChunks: numChunks,
            remainingChunks: numChunks,
            perChunkReward: perChunk,
            exists: true
        });

        emit TaskCreated(taskId, msg.sender, modelUrl, datasetUrl, numChunks, msg.value);
        return taskId;
    }

    /// @notice Whitelisted trainer submits a weight file CID and claims the per-chunk reward.
    /// @dev C2 fix: whitelist check is enforced — only authorised trainers can submit.
    /// @param taskId     The task being trained
    /// @param weightsHash IPFS CID (or Akave hash) of the uploaded weight file
    function submitWeights(
        uint256 taskId,
        string calldata weightsHash
    ) external {
        // C2 — whitelist guard
        require(whitelist[msg.sender], "trainer not whitelisted");

        Task storage t = tasks[taskId];
        require(t.exists, "task does not exist");
        require(t.remainingChunks > 0, "no rewards remaining for this task");

        t.remainingChunks -= 1;
        uint256 reward = t.perChunkReward;

        // Attempt immediate transfer; credit pendingWithdrawals on failure.
        (bool sent, ) = payable(msg.sender).call{value: reward}("");
        if (!sent) {
            pendingWithdrawals[msg.sender] += reward;
        }

        emit WeightsSubmitted(taskId, msg.sender, weightsHash, reward, t.remainingChunks);

        if (t.remainingChunks == 0) {
            emit TaskCompleted(taskId);
            tasks[taskId].exists = false;
        }
    }

    /// @notice Withdraw any pending balance credited due to failed transfers.
    function withdrawPending() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "no pending balance");
        pendingWithdrawals[msg.sender] = 0;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "withdraw transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Cancel a task and refund remaining escrow to depositor.
    ///         Only allowed before any submissions have been made.
    function cancelTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        require(t.exists, "task does not exist");
        require(msg.sender == t.depositor, "only depositor can cancel");
        require(
            t.remainingChunks == t.numChunks,
            "cannot cancel after submissions started"
        );

        uint256 refund = t.perChunkReward * t.remainingChunks;
        delete tasks[taskId];

        (bool sent, ) = t.depositor.call{value: refund}("");
        require(sent, "refund transfer failed");
    }

    /// @notice Admin override for pending withdrawals — e.g. to correct erroneous credits.
    /// @dev C1 fix: restricted to onlyOwner (was public, allowed anyone to drain contract).
    function setPendingWithdrawal(address _address, uint256 _amount) external onlyOwner {
        pendingWithdrawals[_address] = _amount;
    }

    receive() external payable {}
    fallback() external payable {}
}
