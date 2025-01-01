import { BigNumberish, ethers } from "ethers";
import { useRpcHandler } from "../static/scripts/rewards/web3/use-rpc-handler";
import { isRangePriceGiftCardClaimable } from "./pricing";
import { GiftCard } from "./types";

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
  const provider = await useRpcHandler(networkId);
  return provider.connection.url;
}

export function isGiftCardAvailable(giftCard: GiftCard, reward: BigNumberish): boolean {
  return giftCard.denominationType == "RANGE" && isRangePriceGiftCardClaimable(giftCard, reward);
}
