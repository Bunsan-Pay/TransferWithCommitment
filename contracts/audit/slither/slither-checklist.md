'forge clean' running (wd: /home/tokino/hdd931/dev/bunsan_link/contracts)
'forge config --json' running
'forge build --build-info --skip ./test/** ./script/** --force' running (wd: /home/tokino/hdd931/dev/bunsan_link/contracts)
INFO:Detectors:
Detector: arbitrary-send-erc20
SignatureTransfer._transfer(address,address,address,uint256,bytes32) (src/SignatureTransfer/SignatureTransfer.sol#179-186) uses arbitrary from in transferFrom: tokenContract.safeTransferFrom(from,to,value) (src/SignatureTransfer/SignatureTransfer.sol#184)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#arbitrary-from-in-transferfrom
INFO:Detectors:
Detector: calls-loop
SignatureTransfer._transfer(address,address,address,uint256,bytes32) (src/SignatureTransfer/SignatureTransfer.sol#179-186) has external calls inside a loop: tokenContract.allowance(from,address(this)) < value (src/SignatureTransfer/SignatureTransfer.sol#181)
	Calls stack containing the loop:
		SignatureTransfer.transferWithAuthorization(address,CommittedTransferDetail[],uint256,uint256,bytes)
		SignatureTransfer._batchTransfers(address,CommittedTransferDetail[])
		SignatureTransfer._transferWithGuard(address,address,address,uint256,bytes32)
SignatureTransfer._transfer(address,address,address,uint256,bytes32) (src/SignatureTransfer/SignatureTransfer.sol#179-186) has external calls inside a loop: tokenContract.allowance(from,address(this)) < value (src/SignatureTransfer/SignatureTransfer.sol#181)
	Calls stack containing the loop:
		SignatureTransfer.transferWithAuthorization(address,TransferDetail[],uint256,uint256,bytes32,bytes)
		SignatureTransfer._unifiedTransfers(address,TransferDetail[],bytes32)
SelfTransfer._transfer(address,address,uint256,bytes32) (src/SelfTransfer/SelfTransfer.sol#58-65) has external calls inside a loop: tokenContract.allowance(msg.sender,address(this)) < value (src/SelfTransfer/SelfTransfer.sol#60)
	Calls stack containing the loop:
		SelfTransfer.transfer(TransferDetail[],bytes32)
SelfTransfer._transfer(address,address,uint256,bytes32) (src/SelfTransfer/SelfTransfer.sol#58-65) has external calls inside a loop: tokenContract.allowance(msg.sender,address(this)) < value (src/SelfTransfer/SelfTransfer.sol#60)
	Calls stack containing the loop:
		SelfTransfer.transfer(CommittedTransferDetail[])
		SelfTransfer._transferWithGuard(address,address,uint256,bytes32)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation/#calls-inside-a-loop
INFO:Detectors:
Detector: solc-version
Version constraint ^0.8.13 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- VerbatimInvalidDeduplication
	- FullInlinerNonExpressionSplitArgumentEvaluationOrder
	- MissingSideEffectsOnSelectorAccess
	- StorageWriteRemovalBeforeConditionalTermination
	- AbiReencodingHeadOverflowWithStaticArrayCleanup
	- DirtyBytesArrayToStorage
	- InlineAssemblyMemorySideEffects
	- DataLocationChangeInInternalOverride
	- NestedCalldataArrayAbiReencodingSizeValidation.
It is used by:
	- ^0.8.13 (src/Events.sol#2)
	- ^0.8.13 (src/ITransferWithCommitment.sol#2)
	- ^0.8.13 (src/SelfTransfer/ISelfTransfer.sol#2)
	- ^0.8.13 (src/SelfTransfer/SelfTransfer.sol#2)
	- ^0.8.13 (src/SignatureTransfer/Hash.sol#2)
	- ^0.8.13 (src/SignatureTransfer/ISignatureTransfer.sol#2)
	- ^0.8.13 (src/SignatureTransfer/SignatureTransfer.sol#2)
	- ^0.8.13 (src/State/IState.sol#2)
	- ^0.8.13 (src/State/State.sol#2)
	- ^0.8.13 (src/Structs.sol#2)
	- ^0.8.13 (src/TransferWithCommitment.sol#2)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#incorrect-versions-of-solidity
INFO:Detectors:
Detector: missing-inheritance
TransferWithCommitment (src/TransferWithCommitment.sol#6-8) should inherit from ITransferWithCommitment (src/ITransferWithCommitment.sol#7)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-inheritance
INFO:Detectors:
Detector: naming-convention
Function ISignatureTransfer.TRANSFER_WITH_COMMIT_TYPEHASH() (src/SignatureTransfer/ISignatureTransfer.sol#8) is not in mixedCase
Function ISignatureTransfer.UNI_COMMIT_TRANSFER_TYPEHASH() (src/SignatureTransfer/ISignatureTransfer.sol#10) is not in mixedCase
Function ISignatureTransfer.BATCH_TRANSFER_WITH_COMMIT_TYPEHASH() (src/SignatureTransfer/ISignatureTransfer.sol#12) is not in mixedCase
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#conformance-to-solidity-naming-conventions
INFO:Slither:. analyzed (30 contracts with 101 detectors), 10 result(s) found
**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [arbitrary-send-erc20](#arbitrary-send-erc20) (1 results) (High)
 - [calls-loop](#calls-loop) (4 results) (Low)
 - [solc-version](#solc-version) (1 results) (Informational)
 - [missing-inheritance](#missing-inheritance) (1 results) (Informational)
 - [naming-convention](#naming-convention) (3 results) (Informational)
## arbitrary-send-erc20
Impact: High
Confidence: High
 - [ ] ID-0
[SignatureTransfer._transfer(address,address,address,uint256,bytes32)](src/SignatureTransfer/SignatureTransfer.sol#L179-L186) uses arbitrary from in transferFrom: [tokenContract.safeTransferFrom(from,to,value)](src/SignatureTransfer/SignatureTransfer.sol#L184)

src/SignatureTransfer/SignatureTransfer.sol#L179-L186


## calls-loop
Impact: Low
Confidence: Medium
 - [ ] ID-1
[SignatureTransfer._transfer(address,address,address,uint256,bytes32)](src/SignatureTransfer/SignatureTransfer.sol#L179-L186) has external calls inside a loop: [tokenContract.allowance(from,address(this)) < value](src/SignatureTransfer/SignatureTransfer.sol#L181)
	Calls stack containing the loop:
		SignatureTransfer.transferWithAuthorization(address,TransferDetail[],uint256,uint256,bytes32,bytes)
		SignatureTransfer._unifiedTransfers(address,TransferDetail[],bytes32)

src/SignatureTransfer/SignatureTransfer.sol#L179-L186


 - [ ] ID-2
[SignatureTransfer._transfer(address,address,address,uint256,bytes32)](src/SignatureTransfer/SignatureTransfer.sol#L179-L186) has external calls inside a loop: [tokenContract.allowance(from,address(this)) < value](src/SignatureTransfer/SignatureTransfer.sol#L181)
	Calls stack containing the loop:
		SignatureTransfer.transferWithAuthorization(address,CommittedTransferDetail[],uint256,uint256,bytes)
		SignatureTransfer._batchTransfers(address,CommittedTransferDetail[])
		SignatureTransfer._transferWithGuard(address,address,address,uint256,bytes32)

src/SignatureTransfer/SignatureTransfer.sol#L179-L186


 - [ ] ID-3
[SelfTransfer._transfer(address,address,uint256,bytes32)](src/SelfTransfer/SelfTransfer.sol#L58-L65) has external calls inside a loop: [tokenContract.allowance(msg.sender,address(this)) < value](src/SelfTransfer/SelfTransfer.sol#L60)
	Calls stack containing the loop:
		SelfTransfer.transfer(CommittedTransferDetail[])
		SelfTransfer._transferWithGuard(address,address,uint256,bytes32)

src/SelfTransfer/SelfTransfer.sol#L58-L65


 - [ ] ID-4
[SelfTransfer._transfer(address,address,uint256,bytes32)](src/SelfTransfer/SelfTransfer.sol#L58-L65) has external calls inside a loop: [tokenContract.allowance(msg.sender,address(this)) < value](src/SelfTransfer/SelfTransfer.sol#L60)
	Calls stack containing the loop:
		SelfTransfer.transfer(TransferDetail[],bytes32)

src/SelfTransfer/SelfTransfer.sol#L58-L65


## solc-version
Impact: Informational
Confidence: High
 - [ ] ID-5
Version constraint ^0.8.13 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- VerbatimInvalidDeduplication
	- FullInlinerNonExpressionSplitArgumentEvaluationOrder
	- MissingSideEffectsOnSelectorAccess
	- StorageWriteRemovalBeforeConditionalTermination
	- AbiReencodingHeadOverflowWithStaticArrayCleanup
	- DirtyBytesArrayToStorage
	- InlineAssemblyMemorySideEffects
	- DataLocationChangeInInternalOverride
	- NestedCalldataArrayAbiReencodingSizeValidation.
It is used by:
	- [^0.8.13](src/Events.sol#L2)
	- [^0.8.13](src/ITransferWithCommitment.sol#L2)
	- [^0.8.13](src/SelfTransfer/ISelfTransfer.sol#L2)
	- [^0.8.13](src/SelfTransfer/SelfTransfer.sol#L2)
	- [^0.8.13](src/SignatureTransfer/Hash.sol#L2)
	- [^0.8.13](src/SignatureTransfer/ISignatureTransfer.sol#L2)
	- [^0.8.13](src/SignatureTransfer/SignatureTransfer.sol#L2)
	- [^0.8.13](src/State/IState.sol#L2)
	- [^0.8.13](src/State/State.sol#L2)
	- [^0.8.13](src/Structs.sol#L2)
	- [^0.8.13](src/TransferWithCommitment.sol#L2)

src/Events.sol#L2


## missing-inheritance
Impact: Informational
Confidence: High
 - [ ] ID-6
[TransferWithCommitment](src/TransferWithCommitment.sol#L6-L8) should inherit from [ITransferWithCommitment](src/ITransferWithCommitment.sol#L7)

src/TransferWithCommitment.sol#L6-L8


## naming-convention
Impact: Informational
Confidence: High
 - [ ] ID-7
Function [ISignatureTransfer.TRANSFER_WITH_COMMIT_TYPEHASH()](src/SignatureTransfer/ISignatureTransfer.sol#L8) is not in mixedCase

src/SignatureTransfer/ISignatureTransfer.sol#L8


 - [ ] ID-8
Function [ISignatureTransfer.BATCH_TRANSFER_WITH_COMMIT_TYPEHASH()](src/SignatureTransfer/ISignatureTransfer.sol#L12) is not in mixedCase

src/SignatureTransfer/ISignatureTransfer.sol#L12


 - [ ] ID-9
Function [ISignatureTransfer.UNI_COMMIT_TRANSFER_TYPEHASH()](src/SignatureTransfer/ISignatureTransfer.sol#L10) is not in mixedCase

src/SignatureTransfer/ISignatureTransfer.sol#L10


