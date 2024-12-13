import { BigNumberish, ethers } from "ethers";
import { GiftCard } from "./types";
import { isRangePriceGiftCardClaimable } from "./pricing";
import { useRpcHandler } from "../static/scripts/rewards/web3/use-rpc-handler";
import { networkRpcs } from "./constants";

export function getGiftCardOrderId(rewardToAddress: string, signature: string) {
  const checksumAddress = ethers.utils.getAddress(rewardToAddress);
  const integrityString = checksumAddress + ":" + signature;
  const integrityBytes = ethers.utils.toUtf8Bytes(integrityString);
  return ethers.utils.keccak256(integrityBytes);
}

export function getRevealMessageToSign(transactionId: number) {
  return JSON.stringify({
    from: "pay.ubq.fi",
    transactionId: transactionId,
  });
}

export function getMintMessageToSign(type: "permit" | "ubiquity-dollar", chainId: number, txHash: string, productId: number, country: string) {
  return JSON.stringify({
    from: "pay.ubq.fi",
    type,
    chainId,
    txHash,
    productId,
    country,
  });
}

export async function getFastestRpcUrl(networkId: number) {
  try {
    return (await useRpcHandler(networkId)).connection.url;
  } catch (e) {
    console.log(`RpcHandler is having issues. Error: ${e} \nUsing backup rpc.`);
    return networkRpcs[networkId];
  }
}

export function isGiftCardAvailable(giftCard: GiftCard, reward: BigNumberish): boolean {
  return giftCard.denominationType == "RANGE" && isRangePriceGiftCardClaimable(giftCard, reward);
}
