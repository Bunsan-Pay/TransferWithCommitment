// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "./IState.sol";

contract State is IState {
    using BitMaps for BitMaps.BitMap;
    constructor() {}
    mapping(address => BitMaps.BitMap) private _commitmentStates;

    function commitmentUsed(address from, bytes32 commitment) private {
        BitMaps.BitMap storage bitmap = _commitmentStates[from];
        bitmap.set(uint256(commitment));
        emit CommitmentUsed(from, commitment);
    }

    /**
     * @notice Returns the state of an commitment
     * @param payer Payer's address
     * @param commitment Unique commitment
     */
    function commitmentState(address payer, bytes32 commitment) public view returns (bool) {
        BitMaps.BitMap storage bitmap = _commitmentStates[payer];
        return bitmap.get(uint256(commitment));
    }

    /**
     * @notice Guard to prevent replaying a commitment
     * @param from Payer's address
     * @param commitment Unique commitment
     */
    modifier replayGuard(address from, bytes32 commitment) {
        require(!commitmentState(from, commitment), "TransferWithCommitment: commitment is used");
        commitmentUsed(from, commitment);
        _;
    }
}
