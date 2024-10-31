import { BigNumberish } from "ethers";
import { isAllowed } from "../shared/allowed-country-list";
import { isGiftCardAvailable } from "../shared/helpers";
import { GiftCard } from "../shared/types";
import { getGiftCardById } from "./post-order";
import { fallbackIntlMastercard, fallbackIntlVisa, masterCardIntlSkus, visaIntlSkus } from "./reloadly-lists";
import { AccessToken, ReloadlyFailureResponse } from "./types";

export const commonHeaders = {
  "Content-Type": "application/json",
  Accept: "application/com.reloadly.giftcards-v1+json",
};

export interface Env {
  USE_RELOADLY_SANDBOX: string;
  RELOADLY_API_CLIENT_ID: string;
  RELOADLY_API_CLIENT_SECRET: string;
}

export interface ReloadlyAuthResponse {
  access_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

export const RELOADLY_AUTH_URL = "https://auth.reloadly.com/oauth/token";
export const RELOADLY_SANDBOX_API_URL = "https://giftcards-sandbox.reloadly.com";
export const RELOADLY_PRODUCTION_API_URL = "https://web3-gateway-test.com/proxy/reloadly/production";
export function getReloadlyApiBaseUrl(isSandbox: boolean): string {
  if (isSandbox === false) {
    return RELOADLY_PRODUCTION_API_URL;
  }
  return RELOADLY_SANDBOX_API_URL;
}

export async function getAccessToken(env: Env): Promise<AccessToken> {
  console.log("Using Reloadly Sandbox:", env.USE_RELOADLY_SANDBOX !== "false");
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.RELOADLY_API_CLIENT_ID,
      client_secret: env.RELOADLY_API_CLIENT_SECRET,
      grant_type: "client_credentials",
      audience: env.USE_RELOADLY_SANDBOX === "false" ? "https://giftcards.reloadly.com" : "https://giftcards-sandbox.reloadly.com",
    }),
  };

  const res = await fetch(RELOADLY_AUTH_URL, options);
  if (res.status == 200) {
    const successResponse = (await res.json()) as ReloadlyAuthResponse;
    return {
      token: successResponse.access_token,
      isSandbox: env.USE_RELOADLY_SANDBOX !== "false",
    };
  }
  throw `Getting access token failed: ${JSON.stringify(await res.json())}`;
}

export async function findBestCard(countryCode: string, amount: BigNumberish, accessToken: AccessToken): Promise<GiftCard | null> {
  if (!isAllowed(countryCode)) {
    console.error(`Country ${countryCode} is not in the allowed country list.`);
    return null;
  }

  const masterCards = await getGiftCards("mastercard", countryCode, accessToken);
  console.log("length", masterCards.length);
  console.log("typeof ", typeof masterCards);

  const masterCardIntlSku = masterCardIntlSkus.find((sku) => sku.countryCode == countryCode);
  if (masterCardIntlSku) {
    const tokenizedIntlMastercard = masterCards?.find((masterCard) => masterCard.productId == masterCardIntlSku.sku);
    if (tokenizedIntlMastercard && isGiftCardAvailable(tokenizedIntlMastercard, amount)) {
      return tokenizedIntlMastercard;
    }
  }

  const fallbackMastercard = await getFallbackIntlMastercard(accessToken);
  if (fallbackMastercard && isGiftCardAvailable(fallbackMastercard, amount)) {
    return fallbackMastercard;
  }

  const visaCards = await getGiftCards("visa", countryCode, accessToken);
  const visaIntlSku = visaIntlSkus.find((sku) => sku.countryCode == countryCode);
  if (visaIntlSku) {
    const intlVisa = visaCards?.find((visaCard) => visaCard.productId == visaIntlSku.sku);
    if (intlVisa && isGiftCardAvailable(intlVisa, amount)) {
      return intlVisa;
    }
  }

  const fallbackVisa = await getFallbackIntlVisa(accessToken);
  if (fallbackVisa && isGiftCardAvailable(fallbackVisa, amount)) {
    return fallbackVisa;
  }

  const anyMastercard = masterCards?.find((masterCard) => isGiftCardAvailable(masterCard, amount));
  if (anyMastercard) {
    return anyMastercard;
  }

  const anyVisa = visaCards?.find((visaCard) => isGiftCardAvailable(visaCard, amount));
  if (anyVisa) {
    return anyVisa;
  }

  throw new Error(`No suitable card found for country code ${countryCode} and amount ${amount}.`);
}

async function getFallbackIntlMastercard(accessToken: AccessToken): Promise<GiftCard | null> {
  try {
    return await getGiftCardById(fallbackIntlMastercard.sku, accessToken);
  } catch (e) {
    console.error(`Failed to load international US mastercard: ${JSON.stringify(fallbackIntlMastercard)}`, e);
    return null;
  }
}

async function getFallbackIntlVisa(accessToken: AccessToken): Promise<GiftCard | null> {
  try {
    return await getGiftCardById(fallbackIntlVisa.sku, accessToken);
  } catch (e) {
    console.error(`Failed to load international US visa: ${JSON.stringify(fallbackIntlVisa)}\n${e}`);
    return null;
  }
}

export async function getGiftCards(productQuery: string, country: string, accessToken: AccessToken): Promise<GiftCard[]> {
  // productCategoryId = 1 = Finance.
  // This should prevent mixing of other gift cards with similar keywords
  const url = `${getReloadlyApiBaseUrl(accessToken.isSandbox)}/countries/${country}/products?productName=${productQuery}&productCategoryId=1`;

  console.log(`Retrieving gift cards from ${url}`);
  const options = {
    method: "GET",
    headers: {
      ...commonHeaders,
      Authorization: `Bearer ${accessToken.token}`,
    },
  };

  const response = await fetch(url, options);
  const responseJson = await response.json();

  console.log("Response status", response.status);
  console.log(`Response from ${url}`, responseJson);

  if (response.status == 404) {
    return [];
  }

  if (response.status != 200) {
    throw new Error(
      `Error from Reloadly API: ${JSON.stringify({
        status: response.status,
        message: (responseJson as ReloadlyFailureResponse).message,
      })}`
    );
  }

  return responseJson as GiftCard[];
}

export async function getSandboxGiftCard(productQuery: string, country: string, accessToken: AccessToken): Promise<GiftCard> {
  if (!accessToken.isSandbox) {
    throw new Error("Cannot load sandbox card on production");
  }

  const url = `${getReloadlyApiBaseUrl(accessToken.isSandbox)}/products?productName=${productQuery}&productCategoryId=1`;

  console.log(`Retrieving gift cards from ${url}`);
  const options = {
    method: "GET",
    headers: {
      ...commonHeaders,
      Authorization: `Bearer ${accessToken.token}`,
    },
  };

  const response = await fetch(url, options);
  const responseJson = await response.json();

  console.log("Response status", response.status);
  console.log(`Response from ${url}`, responseJson);

  if (response.status != 200) {
    throw new Error(
      `Error from Reloadly API: ${JSON.stringify({
        status: response.status,
        message: (responseJson as ReloadlyFailureResponse).message,
      })}`
    );
  }

  const payamentCards = (responseJson as { content: GiftCard[] })?.content;
  if (payamentCards.length) {
    return payamentCards[0];
  }
  throw new Error(`No suitable card found on sandbox for country code ${country}.`);
}
