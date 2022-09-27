import { equal } from "assert";
import { assert, expect } from "chai";
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { deploymentChains, networkConfig } from "../../helper-hardhat-config"
import { VRFCoordinatorV2Mock } from "../../typechain-types/@chainlink/contracts/src/v0.8/mocks";

!deploymentChains.includes(network.name) 
    ? describe.skip
    : describe("Lottery Unit Tests", function () {
        let lottery: any;
        let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
        const chainId = network.config.chainId || 31337;
        let lotteryEntraceFee: string = "";
        let deployer: string;
        let interval: number;

        beforeEach(async function() {
            deployer  = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"]);

            lottery = await ethers.getContract("Lottery", deployer);
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);   
            lotteryEntraceFee = await lottery.getEntranceFee();      
            interval = (await lottery.getInterval()).toNumber();

        })

        describe("constructor", function(){
            it("initializes the lottery properly", async function() {
                const lotteryState = await lottery.getLotteryState();
                assert.equal(lotteryState.toString(), "0");
                assert.equal(interval.toString(), networkConfig[chainId].keepersUpdateInterval);
            })
        })

        describe("Enter lottery", function() {
            it("reverts if they dont pay enough", async function() {
               await expect(lottery.enterLottery()).to.be.revertedWithCustomError(lottery, "Lottery_NotEnoughETH");
            })

            it("records player when player enters", async function() {
                await lottery.enterLottery({ value: lotteryEntraceFee });
                const playerFromContract = await lottery.getPlayers(0);

                assert.equal(playerFromContract, deployer);
            })

            it("emits an LotteryEnter event", async function() {
                await expect(lottery.enterLottery({ value: lotteryEntraceFee })).to.be.emit(lottery, "LotteryEnter");
            })

            it("doesnt allow entrnace when lottery is calculating", async function(){
                await lottery.enterLottery({ value : lotteryEntraceFee });
                
                //evm_increase adds the number if seconds added to to the timestamp of the latest block
                await network.provider.send("evm_increaseTime", [interval + 1]);
                //evm_mine - mines new block in the local chain
                await network.provider.send("evm_mine"); 

                await lottery.performUpkeep([]);

                await expect(lottery.enterLottery({ value : lotteryEntraceFee })).to.be.revertedWithCustomError(lottery, "Lottery_NotOpen");
                
            })
        })

        describe("checkUpKeep", function() {
            it("returns fales if people havent sent any ETH", async function() {
                await network.provider.send("evm_increaseTime", [interval + 1]);
                await network.provider.send("evm_mine", []);                                
                //callStatic is used to simulate a transcation [tansaction doesnt occur] and get the return from the function
                const {upkeepNeeded} = await lottery.callStatic.checkUpkeep([])

                assert.isFalse(upkeepNeeded)
            })

            it("return false if state is not open", async function() {
                await lottery.enterLottery({ value : lotteryEntraceFee });
                
                //evm_increase adds the number if seconds added to to the timestamp of the latest block
                await network.provider.send("evm_increaseTime", [interval + 1]);
                //evm_mine - mines new block in the local chain
                await network.provider.send("evm_mine"); 
                //0x transform into empty object 
                await lottery.performUpkeep("0x");
                const lotteryState = await lottery.getLotteryState();

                assert.equal(lotteryState, "1");
                const {upkeepNeeded} = await lottery.callStatic.checkUpkeep([]);

                assert.isFalse(upkeepNeeded)
            })

            it("returns false if enough time hasnt passed", async function() {
                await network.provider.send("evm_increaseTime", [interval - 2]);
                await network.provider.send("evm_mine", []);

                const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);

                assert.isFalse(upkeepNeeded);
            })

            it("returns true if player, eth and interval has passed", async function() {
                await lottery.enterLottery({ value : lotteryEntraceFee });
                await network.provider.send("evm_increaseTime", [interval + 1]);
                await network.provider.request({method: "evm_mine", params: []});

                const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");

                assert.isTrue(upkeepNeeded);
            })
        })
        describe("performUpKeep", function() {
            it("it can only run when checkupKeep is true", async function() {
                await lottery.enterLottery({ value: lotteryEntraceFee });
                await network.provider.send("evm_increaseTime", [interval + 1]);
                await network.provider.send("evm_mine", []);

                const tx = await lottery.performUpkeep("0x");
                assert(tx);
            })
            it("reverts with error when checkupkeep is false", async function() {
                await network.provider.send("evm_increaseTime", [interval + 1]);
                await network.provider.send("evm_mine", []);

                await expect(lottery.performUpkeep("0x")).to.be.revertedWithCustomError(lottery, "Lottery_UpKeepNotNeeded");
                
            })
            it("updates lottery states, updates vrf coordinator, emits an event", async function(){
                await lottery.enterLottery({ value : lotteryEntraceFee });
                await network.provider.send("evm_increaseTime", [interval + 1]);
                await network.provider.request({method: "evm_mine", params: []});

                const txResponse = await lottery.performUpkeep("0x");
                const txReceipt = await txResponse.wait(1);

                const lotteryState = await lottery.getLotteryState();
                const requestId = txReceipt.events[1].args.requestId;

                assert(requestId.toNumber());
                assert(lotteryState == 1);
            })
        })
        describe("fullfillRandomWords", function() {
            this.beforeEach(async function() {
                await lottery.enterLottery({ value : lotteryEntraceFee });
                await network.provider.send("evm_increaseTime", [interval + 1]);
                await network.provider.request({method: "evm_mine", params: []});
            })

            it("can only be called after performUpkeep", async function(){
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address))
                        .to.be.revertedWith("nonexistent request")
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address))
                        .to.be.revertedWith("nonexistent request")
            })
             // This test is too big...
            // This test simulates users entering the raffle and wraps the entire functionality of the raffle
            // inside a promise that will resolve if everything is successful.
            // An event listener for the WinnerPicked is set up
            // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
            // All the assertions are done once the WinnerPicked event is fired
            it("picks a winner, resets, and sends money", async () => {
                const additionalEntrances = 3 // to test
                const startingIndex = 2
                const accounts = await ethers.getSigners();
                for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) { // i = 2; i < 5; i=i+1
                    lottery = lottery.connect(accounts[i]) // Returns a new instance of the Raffle contract connected to player
                    await lottery.enterLottery({ value: lotteryEntraceFee })
                }
                const startingTimeStamp = await lottery.getLatestTimeStamp() // stores starting timestamp (before we fire our event)

                // This will be more important for our staging tests...
                await new Promise<void>(async (resolve, reject) => {
                    lottery.once("WinnerPicked", async () => { // event listener for WinnerPicked
                        console.log("WinnerPicked event fired!")
                        // assert throws an error if it fails, so we need to wrap
                        // it in a try/catch so that the promise returns event
                        // if it fails.
                        try {
                            // Now lets get the ending values...
                            const recentWinner = await lottery.getRecentWinner()
                            const raffleState = await lottery.getLotteryState()
                            const winnerBalance = await accounts[2].getBalance()
                            const endingTimeStamp = await lottery.getLatestTimeStamp()
                            await expect(lottery.getPlayers(0)).to.be.reverted
                            // Comparisons to check if our ending values are correct:
                            assert.equal(recentWinner.toString(), accounts[2].address)
                            assert.equal(raffleState, 0)
                            assert.equal(
                                winnerBalance.toString(), 
                                startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                    .add(
                                        ethers.BigNumber.from(lotteryEntraceFee)
                                            .mul(additionalEntrances)
                                            .add(lotteryEntraceFee)
                                    )
                                    .toString()
                            )
                            assert(endingTimeStamp > startingTimeStamp)
                            resolve() // if try passes, resolves the promise 
                        } catch (e) { 
                            reject(e) // if try fails, rejects the promise
                        }
                    })

                    // kicking off the event by mocking the chainlink keepers and vrf coordinator
                    const tx = await lottery.performUpkeep("0x")
                    const txReceipt = await tx.wait(1)
                    const startingBalance = await accounts[2].getBalance()
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt.events[1].args.requestId,
                        lottery.address
                    )
                })
            })
        })
    })
