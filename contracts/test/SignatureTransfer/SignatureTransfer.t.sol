// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Test} from "forge-std/Test.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {TransferWithCommitmentDigest} from "../helpers/TransferWithCommitmentDigest.sol";
import {ERC1271WalletWithApprove} from "../mocks/ERC1271WalletWithApprove.sol";
import {Hash} from "../../src/SignatureTransfer/Hash.sol";
import {TransferDetail, CommittedTransferDetail} from "../../src/Structs.sol";
import "../../src/Events.sol";

/// @dev EIP-712 signature transfer (`SignatureTransfer`) via `TransferWithCommitmentDigest`.
contract SignatureTransferTest is Test {
    TransferWithCommitmentDigest internal twc;
    ERC20Mock internal token;
    uint256 internal alicePk = 0xA11CE;
    address internal alice;
    address internal recipient = address(0xBEEF);
    address internal executor;

    function hashBatchTransferDetailsExternal(TransferDetail[] calldata details) external pure returns (bytes32) {
        return Hash.hashBatchTransferDetails(details);
    }

    function hashBatchCommittedTransferDetailsExternal(CommittedTransferDetail[] calldata details)
        external
        pure
        returns (bytes32)
    {
        return Hash.hashBatchCommittedTransferDetails(details);
    }

    function setUp() public {
        executor = address(this);
        alice = vm.addr(alicePk);
        twc = new TransferWithCommitmentDigest("TWC", "1");
        token = new ERC20Mock();
        token.mint(alice, 10_000 ether);
        vm.prank(alice);
        token.approve(address(twc), type(uint256).max);
    }

    /// @notice `constructor` — EIP-712 domain only (immutable, no governance)
    function test_constructor_setsEip712Domain() public view {
        (, string memory name, string memory version,,,,) = twc.eip712Domain();
        assertEq(name, "TWC");
        assertEq(version, "1");
    }

    /// @notice `validTimestamp` — too early reverts
    function test_validTimestamp_revertsNotYetValid() public {
        vm.warp(1000);
        bytes32 c = keccak256("t1");
        bytes32 structHash = keccak256(
            abi.encode(
                twc.TRANSFER_WITH_COMMIT_TYPEHASH(), alice, recipient, address(token), executor, 1 ether, 1000, 2000, c
            )
        );
        bytes32 digest = twc.hashTypedDataV4(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        vm.expectRevert(bytes("TransferWithCommitment: Signature is not yet valid"));
        twc.transferWithAuthorization(
            alice, recipient, address(token), 1 ether, 1000, 2000, c, abi.encodePacked(r, s, v)
        );
    }

    /// @notice `validTimestamp` — expired reverts
    function test_validTimestamp_revertsExpired() public {
        vm.warp(3000);
        bytes32 c = keccak256("t2");
        bytes32 structHash = keccak256(
            abi.encode(
                twc.TRANSFER_WITH_COMMIT_TYPEHASH(), alice, recipient, address(token), executor, 1 ether, 0, 2000, c
            )
        );
        bytes32 digest = twc.hashTypedDataV4(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        vm.expectRevert(bytes("TransferWithCommitment: Signature is expired"));
        twc.transferWithAuthorization(alice, recipient, address(token), 1 ether, 0, 2000, c, abi.encodePacked(r, s, v));
    }

    /// @notice `validTimestamp` — `validAfter > validBefore` reverts
    function test_validTimestamp_revertsWhenValidAfterGreaterThanValidBefore() public {
        vm.warp(10_000);
        bytes32 c = keccak256("range");
        vm.expectRevert(
            bytes("TransferWithCommitment: The `validAfter` and `validBefore` must be `validAfter<=validBefore`")
        );
        twc.transferWithAuthorization(alice, recipient, address(token), 1 ether, 5000, 1000, c, hex"");
    }

    /// @notice `transferWithAuthorization` (single) — valid signature, transfer and event
    function test_transferWithAuthorization_single() public {
        vm.warp(10_000);
        uint256 validAfter = 0;
        uint256 validBefore = type(uint256).max;
        uint256 amount = 5 ether;
        bytes32 c = keccak256("sig-single");
        bytes32 structHash = keccak256(
            abi.encode(
                twc.TRANSFER_WITH_COMMIT_TYPEHASH(),
                alice,
                recipient,
                address(token),
                executor,
                amount,
                validAfter,
                validBefore,
                c
            )
        );
        bytes32 digest = twc.hashTypedDataV4(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        vm.expectEmit(true, true, true, true);
        emit TransferWithCommitmentSent(alice, recipient, address(token), amount, c);
        twc.transferWithAuthorization(
            alice, recipient, address(token), amount, validAfter, validBefore, c, abi.encodePacked(r, s, v)
        );
        assertEq(token.balanceOf(recipient), amount);
    }

    /// @notice `transferWithAuthorization` (single) — invalid signature reverts (`SignatureChecker`)
    function test_transferWithAuthorization_revertsBadSignature() public {
        vm.warp(10_000);
        bytes32 c = keccak256("bad");
        vm.expectRevert(bytes("TransferWithCommitment: Invalid signature"));
        twc.transferWithAuthorization(alice, recipient, address(token), 1 ether, 0, type(uint256).max, c, hex"00");
    }

    /// @notice `transferWithAuthorization` (single) — replay of commitment reverts
    function test_transferWithAuthorization_revertsReplay() public {
        vm.warp(10_000);
        bytes32 c = keccak256("replay-sig");
        bytes32 structHash = keccak256(
            abi.encode(
                twc.TRANSFER_WITH_COMMIT_TYPEHASH(),
                alice,
                recipient,
                address(token),
                executor,
                1 ether,
                0,
                type(uint256).max,
                c
            )
        );
        bytes32 digest = twc.hashTypedDataV4(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);
        twc.transferWithAuthorization(alice, recipient, address(token), 1 ether, 0, type(uint256).max, c, sig);
        vm.expectRevert(bytes("TransferWithCommitment: commitment is used"));
        twc.transferWithAuthorization(alice, recipient, address(token), 1 ether, 0, type(uint256).max, c, sig);
    }

    /// @notice `transferWithAuthorization` (CommittedTransferDetail[]) — batch with per-commitment guards and batch-level `batchCommitment`
    function test_transferWithAuthorization_committedBatch() public {
        vm.warp(10_000);
        uint256 validAfter = 0;
        uint256 validBefore = type(uint256).max;
        bytes32 c1 = keccak256("b1");
        bytes32 c2 = keccak256("b2");
        bytes32 batchRoot = keccak256("batch-root");
        CommittedTransferDetail[] memory details = new CommittedTransferDetail[](2);
        details[0] = CommittedTransferDetail({to: recipient, token: address(token), value: 2 ether, commitment: c1});
        details[1] =
            CommittedTransferDetail({to: address(0x7777), token: address(token), value: 3 ether, commitment: c2});
        bytes32 batchHash = this.hashBatchCommittedTransferDetailsExternal(details);
        bytes32 structHash = keccak256(
            abi.encode(
                twc.BATCH_TRANSFER_WITH_COMMIT_TYPEHASH(),
                alice,
                executor,
                batchHash,
                validAfter,
                validBefore,
                batchRoot
            )
        );
        bytes32 digest = twc.hashTypedDataV4(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        vm.expectEmit(true, true, true, true);
        emit TransferWithCommitmentSent(alice, recipient, address(token), 2 ether, c1);
        vm.expectEmit(true, true, true, true);
        emit TransferWithCommitmentSent(alice, address(0x7777), address(token), 3 ether, c2);
        twc.transferWithAuthorization(alice, details, validAfter, validBefore, batchRoot, abi.encodePacked(r, s, v));
    }

    /// @notice Batch path — replay of same `batchCommitment` reverts (even with fresh per-line commitments)
    function test_transferWithAuthorization_committedBatch_revertsBatchReplay() public {
        vm.warp(10_000);
        uint256 validAfter = 0;
        uint256 validBefore = type(uint256).max;
        bytes32 batchRoot = keccak256("batch-replay");
        CommittedTransferDetail[] memory details1 = new CommittedTransferDetail[](1);
        details1[0] = CommittedTransferDetail({
            to: recipient, token: address(token), value: 1 ether, commitment: keccak256("l1")
        });
        bytes32 h1 = this.hashBatchCommittedTransferDetailsExternal(details1);
        bytes32 struct1 = keccak256(
            abi.encode(
                twc.BATCH_TRANSFER_WITH_COMMIT_TYPEHASH(), alice, executor, h1, validAfter, validBefore, batchRoot
            )
        );
        bytes32 d1 = twc.hashTypedDataV4(struct1);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(alicePk, d1);
        twc.transferWithAuthorization(alice, details1, validAfter, validBefore, batchRoot, abi.encodePacked(r1, s1, v1));

        CommittedTransferDetail[] memory details2 = new CommittedTransferDetail[](1);
        details2[0] = CommittedTransferDetail({
            to: recipient, token: address(token), value: 1 ether, commitment: keccak256("l2")
        });
        bytes32 h2 = this.hashBatchCommittedTransferDetailsExternal(details2);
        bytes32 struct2 = keccak256(
            abi.encode(
                twc.BATCH_TRANSFER_WITH_COMMIT_TYPEHASH(), alice, executor, h2, validAfter, validBefore, batchRoot
            )
        );
        bytes32 d2 = twc.hashTypedDataV4(struct2);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(alicePk, d2);
        vm.expectRevert(bytes("TransferWithCommitment: commitment is used"));
        twc.transferWithAuthorization(alice, details2, validAfter, validBefore, batchRoot, abi.encodePacked(r2, s2, v2));
    }

    /// @notice `cancelAuthorization(authorizer, batchCommitment)` blocks committed batch with that batch id
    function test_cancelAuthorization_blocksCommittedBatch() public {
        vm.warp(10_000);
        bytes32 batchRoot = keccak256("batch-cancel");
        bytes32 cancelStruct = keccak256(abi.encode(twc.CANCEL_AUTHORIZATION_TYPEHASH(), alice, batchRoot));
        bytes32 cancelDigest = twc.hashTypedDataV4(cancelStruct);
        (uint8 v0, bytes32 r0, bytes32 s0) = vm.sign(alicePk, cancelDigest);
        twc.cancelAuthorization(alice, batchRoot, abi.encodePacked(r0, s0, v0));

        CommittedTransferDetail[] memory details = new CommittedTransferDetail[](1);
        details[0] = CommittedTransferDetail({
            to: recipient, token: address(token), value: 1 ether, commitment: keccak256("line")
        });
        bytes32 bh = this.hashBatchCommittedTransferDetailsExternal(details);
        bytes32 structHash = keccak256(
            abi.encode(twc.BATCH_TRANSFER_WITH_COMMIT_TYPEHASH(), alice, executor, bh, 0, type(uint256).max, batchRoot)
        );
        bytes32 digest = twc.hashTypedDataV4(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        vm.expectRevert(bytes("TransferWithCommitment: commitment is used"));
        twc.transferWithAuthorization(alice, details, 0, type(uint256).max, batchRoot, abi.encodePacked(r, s, v));
    }

    /// @notice `transferWithAuthorization` (TransferDetail[] + unified commitment)
    function test_transferWithAuthorization_unifiedBatch() public {
        vm.warp(10_000);
        uint256 validAfter = 0;
        uint256 validBefore = type(uint256).max;
        bytes32 c = keccak256("uni");
        TransferDetail[] memory details = new TransferDetail[](2);
        details[0] = TransferDetail({to: recipient, token: address(token), value: 1 ether});
        details[1] = TransferDetail({to: address(0x8888), token: address(token), value: 2 ether});
        bytes32 detailsHash = this.hashBatchTransferDetailsExternal(details);
        bytes32 structHash = keccak256(
            abi.encode(twc.UNI_COMMIT_TRANSFER_TYPEHASH(), alice, executor, detailsHash, validAfter, validBefore, c)
        );
        bytes32 digest = twc.hashTypedDataV4(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        vm.expectEmit(true, true, true, true);
        emit TransferWithCommitmentSent(alice, recipient, address(token), 1 ether, c);
        vm.expectEmit(true, true, true, true);
        emit TransferWithCommitmentSent(alice, address(0x8888), address(token), 2 ether, c);
        twc.transferWithAuthorization(alice, details, validAfter, validBefore, c, abi.encodePacked(r, s, v));
    }

    /// @notice `cancelAuthorization` — marks commitment used without token movement
    function test_cancelAuthorization() public {
        bytes32 c = keccak256("cancel");
        bytes32 structHash = keccak256(abi.encode(twc.CANCEL_AUTHORIZATION_TYPEHASH(), alice, c));
        bytes32 digest = twc.hashTypedDataV4(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        uint256 balBefore = token.balanceOf(recipient);
        twc.cancelAuthorization(alice, c, abi.encodePacked(r, s, v));
        assertEq(token.balanceOf(recipient), balBefore);
        assertTrue(twc.commitmentState(alice, c));
    }

    /// @notice `cancelAuthorization` — after cancel, transfer with same commitment reverts
    function test_cancelAuthorization_blocksTransfer() public {
        vm.warp(10_000);
        bytes32 c = keccak256("block");
        bytes32 cancelStruct = keccak256(abi.encode(twc.CANCEL_AUTHORIZATION_TYPEHASH(), alice, c));
        bytes32 cancelDigest = twc.hashTypedDataV4(cancelStruct);
        (uint8 v0, bytes32 r0, bytes32 s0) = vm.sign(alicePk, cancelDigest);
        twc.cancelAuthorization(alice, c, abi.encodePacked(r0, s0, v0));

        bytes32 transferStruct = keccak256(
            abi.encode(
                twc.TRANSFER_WITH_COMMIT_TYPEHASH(),
                alice,
                recipient,
                address(token),
                executor,
                1 ether,
                0,
                type(uint256).max,
                c
            )
        );
        bytes32 transferDigest = twc.hashTypedDataV4(transferStruct);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(alicePk, transferDigest);
        vm.expectRevert(bytes("TransferWithCommitment: commitment is used"));
        twc.transferWithAuthorization(
            alice, recipient, address(token), 1 ether, 0, type(uint256).max, c, abi.encodePacked(r1, s1, v1)
        );
    }

    /// @notice `_transfer` (signature path) — allowance too low reverts `AllowanceNotEnough`
    function test_transferWithAuthorization_revertsAllowanceTooLow() public {
        uint256 poorPk = uint256(keccak256("poor user key"));
        address poor = vm.addr(poorPk);
        token.mint(poor, 100 ether);
        vm.prank(poor);
        token.approve(address(twc), 1 ether);
        vm.warp(10_000);
        bytes32 c = keccak256("allow");
        bytes32 structHash = keccak256(
            abi.encode(
                twc.TRANSFER_WITH_COMMIT_TYPEHASH(),
                poor,
                recipient,
                address(token),
                executor,
                50 ether,
                0,
                type(uint256).max,
                c
            )
        );
        bytes32 digest = twc.hashTypedDataV4(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(poorPk, digest);
        vm.expectRevert(abi.encodeWithSelector(AllowanceNotEnough.selector, address(token), poor, 50 ether));
        twc.transferWithAuthorization(
            poor, recipient, address(token), 50 ether, 0, type(uint256).max, c, abi.encodePacked(r, s, v)
        );
    }

    /// @notice ERC-1271 `from` — valid ECDSA from owner, transfer succeeds
    function test_transferWithAuthorization_erc1271Wallet() public {
        vm.warp(10_000);
        ERC1271WalletWithApprove wallet = new ERC1271WalletWithApprove(alice);
        address walletAddr = address(wallet);
        token.mint(walletAddr, 100 ether);
        vm.prank(alice);
        wallet.approveToken(token, address(twc), type(uint256).max);

        uint256 validAfter = 0;
        uint256 validBefore = type(uint256).max;
        uint256 amount = 4 ether;
        bytes32 c = keccak256("erc1271");
        bytes32 structHash = keccak256(
            abi.encode(
                twc.TRANSFER_WITH_COMMIT_TYPEHASH(),
                walletAddr,
                recipient,
                address(token),
                executor,
                amount,
                validAfter,
                validBefore,
                c
            )
        );
        bytes32 digest = twc.hashTypedDataV4(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        vm.expectEmit(true, true, true, true);
        emit TransferWithCommitmentSent(walletAddr, recipient, address(token), amount, c);
        twc.transferWithAuthorization(
            walletAddr, recipient, address(token), amount, validAfter, validBefore, c, abi.encodePacked(r, s, v)
        );
        assertEq(token.balanceOf(recipient), amount);
    }

    /// @notice Empty `details` on signature batch paths reverts before signature check
    function test_transferWithAuthorization_revertsEmptyCommittedDetails() public {
        vm.warp(10_000);
        CommittedTransferDetail[] memory details = new CommittedTransferDetail[](0);
        vm.expectRevert(bytes("TransferWithCommitment: The length of `details` must be at least 1"));
        twc.transferWithAuthorization(alice, details, 0, type(uint256).max, keccak256("empty-batch"), hex"");
    }

    function test_transferWithAuthorization_revertsEmptyUnifiedDetails() public {
        vm.warp(10_000);
        TransferDetail[] memory details = new TransferDetail[](0);
        vm.expectRevert(bytes("TransferWithCommitment: The length of `details` must be at least 1"));
        twc.transferWithAuthorization(alice, details, 0, type(uint256).max, keccak256("c"), hex"");
    }
}
