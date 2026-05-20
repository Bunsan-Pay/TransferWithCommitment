'forge clean' running (wd: /work/contracts)
'forge config --json' running
'forge build --build-info --skip ./test/** ./script/** --force' running (wd: /work/contracts)
INFO:Detectors:
SignatureTransfer._transfer(address,address,address,uint256,bytes32) (src/SignatureTransfer/SignatureTransfer.sol#182-189) uses arbitrary from in transferFrom: tokenContract.safeTransferFrom(from,to,value) (src/SignatureTransfer/SignatureTransfer.sol#187)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#arbitrary-from-in-transferfrom
INFO:Detectors:
SignatureTransfer._transfer(address,address,address,uint256,bytes32) (src/SignatureTransfer/SignatureTransfer.sol#182-189) has external calls inside a loop: tokenContract.allowance(from,address(this)) < value (src/SignatureTransfer/SignatureTransfer.sol#184)
	Calls stack containing the loop:
		SignatureTransfer.transferWithAuthorization(address,CommittedTransferDetail[],uint256,uint256,bytes32,bytes)
		SignatureTransfer._batchTransfers(address,CommittedTransferDetail[])
		SignatureTransfer._transferWithGuard(address,address,address,uint256,bytes32)
SignatureTransfer._transfer(address,address,address,uint256,bytes32) (src/SignatureTransfer/SignatureTransfer.sol#182-189) has external calls inside a loop: tokenContract.allowance(from,address(this)) < value (src/SignatureTransfer/SignatureTransfer.sol#184)
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
Version constraint ^0.8.22 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- VerbatimInvalidDeduplication.
It is used by:
	- ^0.8.22 (src/Events.sol#2)
	- ^0.8.22 (src/ITransferWithCommitment.sol#2)
	- ^0.8.22 (src/SelfTransfer/ISelfTransfer.sol#2)
	- ^0.8.22 (src/SelfTransfer/SelfTransfer.sol#2)
	- ^0.8.22 (src/SignatureTransfer/Hash.sol#2)
	- ^0.8.22 (src/SignatureTransfer/ISignatureTransfer.sol#2)
	- ^0.8.22 (src/SignatureTransfer/SignatureTransfer.sol#2)
	- ^0.8.22 (src/State/IState.sol#2)
	- ^0.8.22 (src/State/State.sol#2)
	- ^0.8.22 (src/Structs.sol#2)
	- ^0.8.22 (src/TransferWithCommitment.sol#2)
	- ^0.8.22 (src/interfaces/ISingletonFactory.sol#2)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#incorrect-versions-of-solidity
INFO:Slither:. analyzed (31 contracts with 99 detectors), 6 result(s) found
**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [arbitrary-send-erc20](#arbitrary-send-erc20) (1 results) (High)
 - [calls-loop](#calls-loop) (4 results) (Low)
 - [solc-version](#solc-version) (1 results) (Informational)
## arbitrary-send-erc20
Impact: High
Confidence: High
 - [ ] ID-0
[SignatureTransfer._transfer(address,address,address,uint256,bytes32)](src/SignatureTransfer/SignatureTransfer.sol#L182-L189) uses arbitrary from in transferFrom: [tokenContract.safeTransferFrom(from,to,value)](src/SignatureTransfer/SignatureTransfer.sol#L187)

src/SignatureTransfer/SignatureTransfer.sol#L182-L189


## calls-loop
Impact: Low
Confidence: Medium
 - [ ] ID-1
[SignatureTransfer._transfer(address,address,address,uint256,bytes32)](src/SignatureTransfer/SignatureTransfer.sol#L182-L189) has external calls inside a loop: [tokenContract.allowance(from,address(this)) < value](src/SignatureTransfer/SignatureTransfer.sol#L184)
	Calls stack containing the loop:
		SignatureTransfer.transferWithAuthorization(address,TransferDetail[],uint256,uint256,bytes32,bytes)
		SignatureTransfer._unifiedTransfers(address,TransferDetail[],bytes32)

src/SignatureTransfer/SignatureTransfer.sol#L182-L189


 - [ ] ID-2
[SignatureTransfer._transfer(address,address,address,uint256,bytes32)](src/SignatureTransfer/SignatureTransfer.sol#L182-L189) has external calls inside a loop: [tokenContract.allowance(from,address(this)) < value](src/SignatureTransfer/SignatureTransfer.sol#L184)
	Calls stack containing the loop:
		SignatureTransfer.transferWithAuthorization(address,CommittedTransferDetail[],uint256,uint256,bytes32,bytes)
		SignatureTransfer._batchTransfers(address,CommittedTransferDetail[])
		SignatureTransfer._transferWithGuard(address,address,address,uint256,bytes32)

src/SignatureTransfer/SignatureTransfer.sol#L182-L189


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
Version constraint ^0.8.22 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- VerbatimInvalidDeduplication.
It is used by:
	- [^0.8.22](src/Events.sol#L2)
	- [^0.8.22](src/ITransferWithCommitment.sol#L2)
	- [^0.8.22](src/SelfTransfer/ISelfTransfer.sol#L2)
	- [^0.8.22](src/SelfTransfer/SelfTransfer.sol#L2)
	- [^0.8.22](src/SignatureTransfer/Hash.sol#L2)
	- [^0.8.22](src/SignatureTransfer/ISignatureTransfer.sol#L2)
	- [^0.8.22](src/SignatureTransfer/SignatureTransfer.sol#L2)
	- [^0.8.22](src/State/IState.sol#L2)
	- [^0.8.22](src/State/State.sol#L2)
	- [^0.8.22](src/Structs.sol#L2)
	- [^0.8.22](src/TransferWithCommitment.sol#L2)
	- [^0.8.22](src/interfaces/ISingletonFactory.sol#L2)

src/Events.sol#L2


