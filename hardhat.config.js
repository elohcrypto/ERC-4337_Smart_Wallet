require("@nomicfoundation/hardhat-toolbox");
require("hardhat-dependency-compiler");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
  },
  dependencyCompiler: {
    paths: [
      "@account-abstraction/contracts/core/EntryPoint.sol"
    ]
  }
};
