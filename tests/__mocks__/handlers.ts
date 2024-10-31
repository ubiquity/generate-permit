import { http, HttpResponse } from "msw";
import bestCardSandbox from "./best-card-sandbox.json";
import bestMastercardProd from "./best-master-card-prod.json";
import bestVisaProd from "./best-visa-card-prod.json";
import card18597 from "./card-18597.json";
import card18598 from "./card-18598.json";
import noCardMt from "./no-card-mt.json";
import { RELOADLY_AUTH_URL, RELOADLY_PRODUCTION_API_URL, RELOADLY_SANDBOX_API_URL } from "../../functions/helpers";

/**
 * Intercepts the routes and returns a custom payload
 */
export const handlers = [
  // http.get(`${getBaseUrl(true)}/products**`, () => {
  //   return HttpResponse.json(bestCard);
  // }),
  http.post(RELOADLY_AUTH_URL, () => {
    return HttpResponse.json({ access_token: "fooBar" });
  }),
  http.get(`${RELOADLY_PRODUCTION_API_URL}/products/18597`, () => {
    return HttpResponse.json(card18597, { status: 200 });
  }),
  http.get(`${RELOADLY_PRODUCTION_API_URL}/products/18598`, () => {
    return HttpResponse.json(card18598, { status: 200 });
  }),
  http.get(`${RELOADLY_SANDBOX_API_URL}/products`, ({ request }) => {
    const url = new URL(request.url);
    const productName = url.searchParams.get("productName");
    if (productName == "visa") {
      return HttpResponse.json({ content: [bestCardSandbox] }, { status: 200 });
    }
    return HttpResponse.json({ content: [] }, { status: 200 });
  }),
  http.get(`${RELOADLY_PRODUCTION_API_URL}/countries/US/products`, ({ request }) => {
    const url = new URL(request.url);
    const productName = url.searchParams.get("productName");

    if (productName == "mastercard") {
      return HttpResponse.json([bestMastercardProd], { status: 200 });
    }
    if (productName == "visa") {
      return HttpResponse.json([bestVisaProd], { status: 200 });
    }
    return HttpResponse.json([], { status: 200 });
  }),

  http.get(`${RELOADLY_PRODUCTION_API_URL}/countries/MT/products`, () => {
    return HttpResponse.json(noCardMt, { status: 404 });
  }),

  http.all(`*`, ({ request }) => {
    console.error(`All http requests are expected to be mocked in unit tests. Following request was not mocked. ${request.url}`);
    return HttpResponse.json(
      { msg: `All http requests are expected to be mocked in unit tests. Following request was not mocked. ${request.url}` },
      { status: 404 }
    );
  }),
  // http.get(`https://giftcards-sandbox.reloadly.com/products?productName=visa&productCategoryId=1`, () => {
  //   return HttpResponse.json({ content: [bestCard] });
  // }),

  // http.get(`https://giftcards-sandbox.reloadly.com/products**`, () => {
  //   return HttpResponse.json([]);
  // }),
  // http.get(`https://giftcards-sandbox.reloadly.com/products/18598`, () => {
  //   return HttpResponse.json(bestCard);
  // }),
];
