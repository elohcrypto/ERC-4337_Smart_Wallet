
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import "@account-abstraction/contracts/utils/Exec.sol";

contract SmartWallet is BaseAccount {
    IEntryPoint private immutable _entryPoint;
    address public owner;
    uint256 public nonce;

    // Events
    event SmartWalletInitialized(address indexed entryPoint, address indexed owner);
    event TransactionExecuted(address indexed target, uint256 value, bytes data);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    // Constructor
    constructor(IEntryPoint entryPoint_, address owner_) {
        _entryPoint = entryPoint_;
        owner = owner_;
        emit SmartWalletInitialized(address(entryPoint_), owner_);
    }

    // External functions
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        _requireFromEntryPoint();
        
        // Call _validateSignature to verify the signature
        validationData = _validateSignature(userOp, userOpHash);
        require(validationData == 0, "Invalid signature");
    
        // Pay pre-funded gas if needed
        _payPrefund(missingAccountFunds);
    
        return validationData;
    }
    
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal pure override returns (uint256 validationData) {
        bytes memory signature = userOp.signature;
        // Placeholder: Check if signature is non-empty (backend handles Passkey verification)
        if (signature.length > 0) {
            return 0; // Valid signature
        }
        return 1; // Invalid signature
    }

    function execute(address target, uint256 value, bytes calldata data) external override {
        require(msg.sender == address(_entryPoint), "Only EntryPoint can call");
        (bool success, ) = target.call{value: value}(data);
        require(success, "Execution failed");
        emit TransactionExecuted(target, value, data);
    }

    function updateOwner(address newOwner) external {
        require(msg.sender == owner, "Only owner can update");
        require(newOwner != address(0), "Invalid new owner");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerUpdated(oldOwner, newOwner);
    }

    function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas) external {
        _requireFromEntryPoint();
        require(targets.length == values.length && values.length == datas.length, "Array length mismatch");
        
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, ) = targets[i].call{value: values[i]}(datas[i]);
            require(success, "Batch execution failed");
            emit TransactionExecuted(targets[i], values[i], datas[i]);
        }
    }
    
    function _requireFromEntryPoint() internal view override {
        require(msg.sender == address(_entryPoint), "account: not from EntryPoint");
    }
    
    function _requireForExecute() internal view override {
        _requireFromEntryPoint();
    }
    
    function _validateNonce(uint256 nonceParam) internal view override {
        require(nonceParam == nonce, "Invalid nonce");
    }
    
    function _payPrefund(uint256 missingAccountFunds) internal override {
        if (missingAccountFunds != 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
            (success);
        }
    }
    
    // View functions
    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }
    
    function getNonce() public view override returns (uint256) {
        return nonce;
    }
}