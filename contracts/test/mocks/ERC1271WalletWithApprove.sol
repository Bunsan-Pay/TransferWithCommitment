// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC1271WalletMock} from "@openzeppelin/contracts/mocks/ERC1271WalletMock.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev ERC-1271 wallet whose `owner()` EOA can `approve` spenders for ERC-20 tests.
contract ERC1271WalletWithApprove is ERC1271WalletMock {
    constructor(address originalOwner) ERC1271WalletMock(originalOwner) {}

    function approveToken(IERC20 token, address spender, uint256 amount) external onlyOwner {
        token.approve(spender, amount);
    }
}
