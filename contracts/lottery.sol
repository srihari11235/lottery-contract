//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

error Lottery_NotEnoughETH();
error Lottery_TransferFailed();
error Lottery_NotOpen();
error Lottery_UpKeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 lotteryState);

/** @title Lottery Contract
 * @author Srihari Haridasan 
 * @notice this contract is for creating a dapp
 * @dev this implemetents chainling VRF and chainlink keepers. Created as part of tutorial by Patrik Collins @freecodecamp.
 */

contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface  {
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    /* State variables*/
    address payable[] private s_lotteryPlayers;
    uint256 private immutable i_entrancefee;
    //chain link interface to utilize the methods.
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATION = 3;
    uint32 private immutable i_callBackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    /* Events */
    event LotteryEnter(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    /* lottery variables */
    address private s_recentWinner;
    uint256 private s_lastTimeStamp;
    LotteryState private s_LotteryState;
    uint256 private immutable i_interval;
    

    constructor(address vrfCoordinatorV2, //contract - this needs a mock
        uint256 entrancefee, 
        bytes32 keyHash, 
        uint64 subscriptionId, 
        uint32 callBackGasLimit,
        uint256 interval) VRFConsumerBaseV2(vrfCoordinatorV2) {
        //initializing chainlink interface
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_entrancefee = entrancefee;
        i_keyHash = keyHash;
        i_subscriptionId = subscriptionId;
        i_callBackGasLimit = callBackGasLimit;
        s_lastTimeStamp = block.timestamp;
        s_LotteryState = LotteryState.OPEN;
        i_interval = interval;
    }

    
    function enterLottery() public payable {
        if(s_LotteryState != LotteryState.OPEN) {
            revert Lottery_NotOpen();
        }

        if(i_entrancefee > msg.value){
            revert Lottery_NotEnoughETH();
        }

        s_lotteryPlayers.push(payable(msg.sender));
        emit LotteryEnter(msg.sender);        
    }

    /** 
    * @dev - This function is called by chailink keepers. The method is called at the interval of each new block
    * getting added to the block chain. The logic is run off-chain in one of the chainlink nodes. 
    * It return upKeepNeeded bool to inform keepers to call 'performUpKeep'. We can also return performData that will get 
    * passed to 'performUpKeep'. More details: https://docs.chain.link/docs/chainlink-keepers/compatible-contracts/  
    * Prerequiste 
    * 1. Subscription should be funded with LINK. 
    * 2. At least one player should be avaialbe with ETH. 
    * 3. Should pass time interval
    * 4. The lottery should be in a "Open" State. [the period where after time elapsed and we are waiting for random number. New players should not join]
    */
    function checkUpkeep(bytes memory /* checkData */) public view override returns (bool upkeepNeeded, bytes memory /* performData */) {
        bool isOpen = s_LotteryState == LotteryState.OPEN;
        
        bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool hasPlayers = s_lotteryPlayers.length > 0 ;
        bool hasBalance = address(this).balance > 0;
       
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance );
    }

    //Perform upkeep is called automaticall by chainlink keepers once 'checkupkeep' return upKeepNeeded as true.
    function performUpkeep(bytes calldata /* performData */) external override {

        //recheck checkUpkeep needed. 
        (bool upKeepNeed, ) = checkUpkeep("");
        if(!upKeepNeed) {
            revert Lottery_UpKeepNotNeeded(address(this).balance, s_lotteryPlayers.length, uint256(s_LotteryState));
        } 

        s_LotteryState = LotteryState.CALCULATING;
        //the method returns requestId with information above who requested it etc.
        //internally chainlink then calls fullfilrandom words method.
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash, //also called gasLane => similar to gasLimit, if at the time of requesting the gas required to get random number is very high. This limit will stop the random number request.
            i_subscriptionId, // subscriptionId created in the chailink site buy connect wallet.
            REQUEST_CONFIRMATION, // number of request to wait 
            i_callBackGasLimit, //limit for how much computation fulfillRandomWords can be. 
            NUM_WORDS // number of random words to request.
            );
        //This is redundant. vrfCoordinator already emits an event which can be used.
        emit RequestedLotteryWinner(requestId);
    }

    function fulfillRandomWords(uint256 /* requestId */, uint256[] memory randomWords) internal override {
        //generated random words is passed as parameter to this method when called by chainlink keepers.
        //we do the modulus operation to generate random number within index range of lottery players. 
        uint256 indexOfWinner = randomWords[0] % s_lotteryPlayers.length; 
        //get the winner address from the players who have entered lottery. 
        address payable recentWinner = s_lotteryPlayers[indexOfWinner];
        s_recentWinner = recentWinner;
        //send the balance to the winner address
        (bool success, ) = recentWinner.call{value: address(this).balance}("");

        //reset variable once winner is choosen.
        s_LotteryState = LotteryState.OPEN;
        s_lotteryPlayers = new address payable[](0);
        s_lastTimeStamp = block.timestamp;

        if(!success) {
            revert Lottery_TransferFailed();
        }

        emit WinnerPicked(recentWinner);
    }


    /* View/ Pure functions */
    function getEntranceFee() public view returns(uint256) {
        return i_entrancefee;
    }

    function getPlayers(uint256 index) public view returns(address) {
        return s_lotteryPlayers[index];
    }

    function getRecentWinner() public view returns(address) {
        return s_recentWinner;
    }

    function getLotteryState() public view returns (LotteryState) {
        return s_LotteryState;
    }

    //NUM_WORDS is a const variable and is stored in the  contract byte code on compilation. SO this can be marked as a 'Pure function
    //use 'pure' when functions are reading/returning constant variables
    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_lotteryPlayers.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;        
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATION;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}


