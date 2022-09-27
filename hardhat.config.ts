import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter";
import * as dotenv from 'dotenv';
dotenv.config();
import { HardhatUserConfig } from "hardhat/config"
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_APIKEY = process.env.ETHERSCAN_APIKEY;
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || "";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.7"
      },
      {
        version: "0.8.4"
      }
    ]
  },
  defaultNetwork: "hardhat",
  networks: {
    //connect to testnet by configuring the RPC url and providing private key of account with which we can connect.
    //command to specify network 'npx hardhat deploy --network <name>'
    rinkeby: {      
      url: RINKEBY_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 4,
    },     
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 5
    },
    localhost: {
      url: 'http://127.0.0.1:8545/',
      chainId: 31337      
    },   
  },
  etherscan: {
    apiKey: ETHERSCAN_APIKEY
  },
  gasReporter: {
    enabled: true,
    //generate report to a file
    outputFile: "gas-report.txt",
    noColors: true    
  },
  namedAccounts: {
    deployer: {
      default: 0
    },
    player: {
      default: 1
    }
  },
  mocha: {
    timeout: 11000000
  }
}

export default config;
