
import { assert, expect } from "chai";
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { deploymentChains, networkConfig } from "../../helper-hardhat-config"

//to run use comman npx hardhat test --network <network-name>
deploymentChains.includes(network.name) 
    ? describe.skip
    : describe("Lottery Staging Tests", function () {
        let lottery: any;
        const chainId = network.config.chainId;
        let lotteryEntraceFee: string = "";
        let deployer: string;

        beforeEach(async function() {
            deployer  = (await getNamedAccounts()).deployer;

            console.log("deployer address", deployer);
            lottery = await ethers.getContract("Lottery", deployer);
            console.log("got contract", lottery.address); //contract address : 0x03792bF679C7E2BF62D9d28049695a15F8f28587
            lotteryEntraceFee = await lottery.getEntranceFee();     
        })

        describe("fulfillRandomWords", function () {
            it("works with live chainlink keepers and chainlink VRF, we get a random winner", async function() {
                // enter the raffle
				console.log('Setting up test...')

                const startingTimeStamp = lottery.getLatestTimeStamp();
                const accounts = await ethers.getSigners();

                console.log("account 0 address", accounts[0].address);

                console.log('Setting up Listener...')
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
                            const winnerBalance = await accounts[0].getBalance()
                            const endingTimeStamp = await lottery.getLatestTimeStamp()
                            await expect(lottery.getPlayers(0)).to.be.reverted

                            console.log("Winner balance in ethers", ethers.utils.parseEther(winnerBalance.toString()));
                            console.log("starting balance in ethers", 
                                ethers.utils.parseEther(ethers.BigNumber.from(startingBalance).toString()));
                            console.log("entrance fee in ethers", ethers.utils.parseEther(lotteryEntraceFee.toString()));
                            // Comparisons to check if our ending values are correct:
                            assert.equal(recentWinner.toString(), accounts[0].address)
                            assert.equal(raffleState, 0)
                            assert.equal(
                                winnerBalance.toString(), 
                                ethers.BigNumber.from(startingBalance)
                                    .add(lotteryEntraceFee)
                                    .toString()
                            )
                            assert(endingTimeStamp > startingTimeStamp)
                            resolve() // if try passes, resolves the promise 
                        } catch (e) { 
                            reject(e) // if try fails, rejects the promise
                        }
                    })

                    console.log("entering lottery");
                    const txResponse = await lottery.enterLottery({ value: lotteryEntraceFee });
                    const txReceipt = txResponse.wait(1);
                    console.log("waiting..");
                    const startingBalance = await accounts[0].getBalance();   
                });


            })
        })
    });