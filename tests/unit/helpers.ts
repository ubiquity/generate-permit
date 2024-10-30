import { parseEther } from "@ethersproject/units";
import { env } from "cloudflare:test";
import { Context } from "../../functions/types";

export const TESTS_BASE_URL = "https://localhost";

export function getEventContext(execContext: ExecutionContext, isSandbox: boolean = false) {
  const request = new Request(`${TESTS_BASE_URL}/get-best-card?country=US&amount=${parseEther("50")}`) as Request<
    unknown,
    IncomingRequestCfProperties<unknown>
  >;
  const eventCtx: EventContext<typeof env, string, Record<string, unknown>> = {
    request,
    functionPath: "",
    waitUntil: execContext.waitUntil.bind(execContext),
    passThroughOnException: execContext.passThroughOnException.bind(execContext),
    async next() {
      return new Response();
    },
    env: {
      ...Object.assign({}, env, { USE_RELOADLY_SANDBOX: isSandbox }),
      ASSETS: {
        fetch,
      },
    },
    params: {},
    data: {},
  };
  return eventCtx as Context;
}
