import { ethers } from "ethers";

export const BLOCK_CONFIRMATION = 6;
export const deploymentChains = ["hardhat", "localhost"];

export interface networkConfigItem {
    name?: string,
    lotteryEntraceFee?: string,
    gasLane?: string,
    subscriptionId?: string,
    callBackGasLimit?: string,
    keepersUpdateInterval?: string,
    vrfCoordinator?: string
}

export interface networkConfigInfo {
    [key: number]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
    4: {
        name: "rinkeby",
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        lotteryEntraceFee: ethers.utils.parseEther("0.01").toString(),
        subscriptionId: "",
        callBackGasLimit: "",
        keepersUpdateInterval: "",
        vrfCoordinator: ""
    },
    5: {
        name: "goerli",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        lotteryEntraceFee: ethers.utils.parseEther("0.01").toString(),
        subscriptionId: "1254", // Subscription id created from chain link UI for goerli
        callBackGasLimit: "500000",
        keepersUpdateInterval: "30", //seconds
        vrfCoordinator: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D"
    },
    31337: {
        name: "localhost",
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // not required for local
        lotteryEntraceFee: ethers.utils.parseEther("0.01").toString(),
        subscriptionId: "1254", // not required for local
        callBackGasLimit: "500000",
        keepersUpdateInterval: "30", //seconds
        /*vrfCoordinator*/   // not needed for local. Address is retrieved from deployed local mock
    }
};

//VRFCoordinatorV3Mock arguments
export const BASE_FEE = ethers.utils.parseEther("0.25");
export const GAS_PRICE_LINK = ethers.utils.parseEther("0.000000001");
export const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("5");