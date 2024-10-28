import { http, HttpResponse } from "msw";
import bestCard from "./get-best-card.json";

/**
 * Intercepts the routes and returns a custom payload
 */
export const handlers = [
  // http.get(`${getBaseUrl(true)}/products**`, () => {
  //   return HttpResponse.json(bestCard);
  // }),
  http.post(`https://auth.reloadly.com/oauth/token`, () => {
    return HttpResponse.json({ access_token: "something" });
  }),
  http.get(`https://giftcards-sandbox.reloadly.com/products`, ({ request }) => {
    const url = new URL(request.url);
    const productName = url.searchParams.get("productName");
    if (productName == "visa") {
      return HttpResponse.json({ content: [bestCard] }, { status: 200 });
    }
    return HttpResponse.json({ content: [] }, { status: 200 });
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
