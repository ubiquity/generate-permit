import { BigNumber } from "ethers";
import { getAccessToken, findBestCard, getSandboxGiftCard } from "./helpers";
import { Context } from "./types";
import { validateEnvVars, validateRequestMethod } from "./validators";
import { getBestCardParamsSchema } from "../shared/api-types";

export async function onRequest(ctx: Context): Promise<Response> {
  try {
    validateRequestMethod(ctx.request.method, "GET");
    validateEnvVars(ctx);

    const { searchParams } = new URL(ctx.request.url);
    const result = getBestCardParamsSchema.safeParse({
      country: searchParams.get("country"),
      amount: searchParams.get("amount"),
    });
    if (!result.success) {
      throw new Error(`Invalid parameters: ${JSON.stringify(result.error.errors)}`);
    }
    const { country, amount } = result.data;

    const accessToken = await getAccessToken(ctx.env);

    let bestCard = null;
    if (accessToken.isSandbox) {
      // Load product differently on Reloadly sandbox
      // Sandbox doesn't have mastercard, it has only 1 visa card for US.
      // This visa card doesn't load with location based url, let's use special url
      // for this so that we have something to try on sandbox
      bestCard = await getSandboxGiftCard("visa", country, accessToken);
    } else {
      bestCard = await findBestCard(country, BigNumber.from(amount), accessToken);
    }

    if (bestCard) {
      return Response.json(bestCard, { status: 200 });
    }
    return Response.json({ message: "There are no gift cards available." }, { status: 404 });
  } catch (error) {
    console.error("There was an error while processing your request.", error);
    return Response.json({ message: "There was an error while processing your request." }, { status: 500 });
  }
}
