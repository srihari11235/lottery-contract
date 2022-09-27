import { network, ethers }  from "hardhat"
import {DeployFunction} from "hardhat-deploy/types"
import { BLOCK_CONFIRMATION, deploymentChains, networkConfig, VRF_SUB_FUND_AMOUNT } from "../helper-hardhat-config";
import verify from "../utils/verify";

const deployLottery: DeployFunction = async ({getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts();
  const { deploy , log } = deployments;
  const chainId = network.config.chainId || 5 ;

  let vrfCoordinatorAddress = '';
  let subscriptionId;

  if(deploymentChains.includes(network.name)) {
    log("Network: Local network");

    const vrfCoordinatorMock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
    vrfCoordinatorAddress = vrfCoordinatorMock.address;

    const transactionResponse = await vrfCoordinatorMock.createSubscription();    
    const transactionReceipt = await transactionResponse.wait(1);

    subscriptionId = transactionReceipt.events[0].args.subId;
    await vrfCoordinatorMock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
  } else {
    log(`Network chainId: ${chainId}`);
    vrfCoordinatorAddress = networkConfig[chainId].vrfCoordinator || "";
    subscriptionId = networkConfig[chainId].subscriptionId;
  }

  const args = [vrfCoordinatorAddress, networkConfig[chainId].lotteryEntraceFee, networkConfig[chainId].gasLane, 
  subscriptionId, networkConfig[chainId].callBackGasLimit, networkConfig[chainId].keepersUpdateInterval]

  const waitBlockConfirmations = deploymentChains.includes(network.name)
      ? 1
      : BLOCK_CONFIRMATION

  const lottery = await deploy('Lottery', {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: waitBlockConfirmations
  })

  log("Deployed successfully.");

  if(!deploymentChains.includes(network.name) && process.env.ETHERSCAN_APIKEY) {
    await verify(lottery.address, args);
  }

}

export default deployLottery;
deployLottery.tags = ["all", "lottery"]