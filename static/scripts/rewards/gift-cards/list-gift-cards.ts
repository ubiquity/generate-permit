import { getGiftCardOrderId } from "../../../../shared/helpers";
import { GiftCard, OrderTransaction } from "../../../../shared/types";
import { AppState } from "../app-state";
import { attachActivateInfoAction } from "./activate/activate-action";
import { attachClaimAction } from "./claim/claim-action";
import { attachRevealAction } from "./reveal/reveal-action";
import { getApiBaseUrl } from "./helpers";
import { getGiftCardActivateInfoHtml } from "./activate/activate-html";
import { getGiftCardHtml } from "./gift-card";
import { getRedeemCodeHtml } from "./reveal/redeem-code-html";

export async function initClaimGiftCard(app: AppState) {
  const giftCardsSection = document.getElementById("gift-cards");
  if (!giftCardsSection) {
    console.error("Missing gift cards section #gift-cards");
    return;
  }
  giftCardsSection.innerHTML = "Loading...";

  const activateInfoSection = document.getElementById("activate-info");
  if (!activateInfoSection) {
    console.error("Missing gift cards activate info section #activate-info");
    return;
  }
  activateInfoSection.innerHTML = "";

  const retrieveOrderUrl = `${getApiBaseUrl()}/get-order?orderId=${getGiftCardOrderId(app.reward.beneficiary, app.reward.signature)}`;
  const listGiftCardsUrl = `${getApiBaseUrl()}/list-gift-cards`;

  const requestInit = {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  };

  const [retrieveOrderResponse, retrieveGiftCardsResponse] = await Promise.all([fetch(retrieveOrderUrl, requestInit), fetch(listGiftCardsUrl, requestInit)]);

  const transaction = (await retrieveOrderResponse.json()) as OrderTransaction;
  const giftCards = (await retrieveGiftCardsResponse.json()) as GiftCard[];

  if (retrieveOrderResponse.status == 200) {
    const giftCard = giftCards.find((giftCard) => transaction.product.productId == giftCard.productId);
    const giftCardsHtmlParts: string[] = [];
    giftCardsHtmlParts.push(`<h2 class="heading-gift-card">Your gift card</h2>`);
    giftCardsHtmlParts.push(`<div class="gift-cards-wrapper purchased">`);
    if (giftCard) {
      giftCardsHtmlParts.push(getGiftCardHtml(giftCard, app.reward.amount));
    }
    giftCardsHtmlParts.push(getRedeemCodeHtml(transaction));
    giftCardsHtmlParts.push(`</div>`);
    giftCardsSection.innerHTML = giftCardsHtmlParts.join(",");

    const activateInfoHtmlParts: string[] = [];
    if (giftCard) {
      activateInfoHtmlParts.push(getGiftCardActivateInfoHtml(giftCard));
    }

    activateInfoSection.innerHTML = activateInfoHtmlParts.join("");

    attachRevealAction(transaction, app);
  } else if (retrieveGiftCardsResponse.status == 200) {
    const giftCardsHtmlParts: string[] = [];
    giftCardsHtmlParts.push(`<h2 class="heading-gift-card">Or claim in virtual visa/mastercard</h2>`);
    giftCardsHtmlParts.push(`<div class="gift-cards-wrapper${giftCards.length < 3 ? " center" : ""}">`);
    giftCards.forEach((giftCard: GiftCard) => {
      giftCardsHtmlParts.push(getGiftCardHtml(giftCard, app.reward.amount));
    });
    giftCardsHtmlParts.push(`</div>`);

    giftCardsSection.innerHTML = giftCardsHtmlParts.join("");

    const activateInfoHtmlParts: string[] = [];
    giftCards.forEach((giftCard: GiftCard) => {
      activateInfoHtmlParts.push(getGiftCardActivateInfoHtml(giftCard));
    });
    activateInfoSection.innerHTML = activateInfoHtmlParts.join("");

    attachClaimAction("claim-gift-card-btn", giftCards, app);
  } else if (retrieveGiftCardsResponse.status == 404) {
    giftCardsSection.innerHTML = "<p class='list-error'>There are no Visa/Mastercard available to claim at the moment.</p>";
  } else {
    giftCardsSection.innerHTML = "<p class='list-error'>There was a problem in fetching gift cards. Try again later.</p>";
  }

  attachActivateInfoAction();
}
