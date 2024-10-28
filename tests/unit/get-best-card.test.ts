import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { onRequest as pagesFunction } from "../../functions/get-best-card";
import { server } from "../__mocks__/node";
import bestCard from "../__mocks__/get-best-card.json";

describe(
  "Get best payment card",
  () => {
    beforeAll(() => {
      try {
        server.listen();
      } catch (e) {
        console.log("done error");
      }
    });

    afterEach(() => {
      server.resetHandlers();
    });

    afterAll(() => server.close());

    it("should respond with correct payment card", async () => {
      // Create an empty context to pass to `worker.fetch()`
      const execContext = createExecutionContext();
      const eventCtx = getEventContext(execContext);
      const response = await pagesFunction(eventCtx);
      await waitOnExecutionContext(execContext);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(bestCard);
    });
  },
  { timeout: 20000 }
);

function getEventContext(execContext: ExecutionContext) {
  const request = new Request("http://localhost/get-best-card?country=US&amount=50000000000000000000");

  const params = { slug: "hello" };
  const data = {};
  const eventCtx: Parameters<typeof pagesFunction>[0] = {
    request,
    functionPath: "",
    waitUntil: execContext.waitUntil.bind(execContext),
    passThroughOnException: execContext.passThroughOnException.bind(execContext),
    async next(input, init) {
      const request = new Request(input ?? "http://placeholder", init);
      return new Response(`next:${request.method} ${request.url}`);
    },
    env: {
      ...env,
      ASSETS: {
        async fetch(input, init) {
          const request = new Request(input, init);
          return new Response(`ASSETS:${request.method} ${request.url}`);
        },
      },
    },
    params,
    data,
  };

  return eventCtx;
}
