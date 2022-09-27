import { network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { BASE_FEE, deploymentChains, GAS_PRICE_LINK } from "../helper-hardhat-config";

const deployMocks: DeployFunction = async ({getNamedAccounts, deployments}) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, log } = deployments;


    if(deploymentChains.includes(network.name)) {
        log(`Deploying Mocks in development chain ${network.name}`)
        await deploy("VRFCoordinatorV2Mock", {
            contract: "VRFCoordinatorV2Mock",
            from: deployer,
            //basefee: Gas required to run this contract. Find :https://docs.chain.link/docs/vrf/v2/supported-networks/. 0.25 LINK => gas required for ORACLE
            //Chainlink spends gas (as LINK) when calling methods in smart contract. The Gas_Price_Link can be set to denote the link per gas.
            args: [BASE_FEE, GAS_PRICE_LINK], 
            log: true
        })

        log("Mocks Deployed!")
        log("----------------------------------")
        log("You are deploying to a local network, you'll need a local network running to interact")
        log(
            "Please run `npx hardhat console --network localhost` to interact with the deployed smart contracts!"
        )
        log("----------------------------------")
    }
}

export default deployMocks;
deployMocks.tags = ["all", "mocks"];