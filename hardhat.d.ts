declare module 'hardhat/config' {
  export interface HardhatUserConfig {
    solidity: any;
    networks: any;
    etherscan?: any;
    [key: string]: any;
  }
}

declare module '@nomicfoundation/hardhat-toolbox' {}
