# Lottery 

This project was created by following a [tutorial](https://www.youtube.com/watch?v=gyMwXuJrbJQ&t=57794s). 

The contract has been deployed to Goeril testnet at Address: [0x03792bF679C7E2BF62D9d28049695a15F8f28587](https://goerli.etherscan.io/address/0x03792bF679C7E2BF62D9d28049695a15F8f28587)

## Description

Players can enter the lottery by sending a minimum amonut of ETH to the contract. The contract picks a random winner at predefined intervals from all the players who entered the lottery. To obtain randomness Chainlink [VRFConrdinatorV2](https://docs.chain.link/docs/vrf/v2/introduction/) is used. 


## Highlights

1. Contract uses Orcale to select a random winner from the list of entered players.
2. Hardhat deployment scripts are used to dynamically deploy to local network/testnet.
3. Script also verify's deployed contract in etherscan blockexplorer. 
4. Unit tests added with good code coverage and staging test written to run tests in testnet.
