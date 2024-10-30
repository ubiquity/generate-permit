import { http, HttpResponse } from "msw";
import bestCard from "./get-best-card.json";
import { RELOADLY_AUTH_URL, RELOADLY_SANDBOX_API_URL } from "../../functions/helpers";

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
  http.get(`${RELOADLY_SANDBOX_API_URL}/products`, ({ request }) => {
    const url = new URL(request.url);
    const productName = url.searchParams.get("productName");
    if (productName == "visa") {
      return HttpResponse.json({ content: [bestCard] }, { status: 200 });
    }
    return HttpResponse.json({ content: [] }, { status: 200 });
  }),
  http.all(`*`, ({ request }) => {
    console.error(`All http requests are expected to be mocked in unit tests. Following request was not mocked. ${request.url}`);
    return HttpResponse.text(`All http requests are expected to be mocked in unit tests. Following request was not mocked. ${request.url}`, { status: 404 });
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
