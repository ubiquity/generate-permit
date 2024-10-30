import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { onRequest as pagesFunction } from "../../functions/get-best-card";
import bestCard from "../__mocks__/get-best-card.json";
import { server } from "../__mocks__/node";
import { getEventContext as createEventContext } from "./helpers";

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
      const eventCtx = createEventContext(execContext);
      const response = await pagesFunction(eventCtx);
      await waitOnExecutionContext(execContext);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(bestCard);
    });
  },
  { timeout: 20000 }
);
