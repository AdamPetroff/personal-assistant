import { BlockchainNetwork } from "../blockchain-types";
import { TokenInfo } from "./types";

/**
 * List of tokens to track across networks
 */
export const tokenList: TokenInfo[] = [
    {
        contractAddress: "0x82a605D6D9114F4Ad6D5Ee461027477EeED31E34",
        network: BlockchainNetwork.ETHEREUM,
        symbol: "SNSY",
        name: "Sensay",
        decimals: 18
    },
    {
        contractAddress: "0x55d398326f99059fF775485246999027B3197955",
        network: BlockchainNetwork.BSC,
        symbol: "USDT",
        name: "Tether",
        decimals: 18
    },
    {
        contractAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        network: BlockchainNetwork.BASE,
        symbol: "USDT",
        name: "Tether",
        decimals: 6
    },
    {
        contractAddress: "0x50CE4129Ca261CCDe4EB100c170843c2936Bc11b",
        network: BlockchainNetwork.BASE,
        symbol: "KOLZ",
        name: "Kolz",
        decimals: 18
    }
];
