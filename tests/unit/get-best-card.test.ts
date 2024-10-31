import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { parseEther } from "@ethersproject/units";
import { onRequest as pagesFunction } from "../../functions/get-best-card";
import bestCard from "../__mocks__/best-card-sandbox.json";
import card18597 from "../__mocks__/card-18597.json";
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

    it("should respond with correct payment card on production", async () => {
      const execContext = createExecutionContext();
      const path = `/get-best-card?country=US&amount=${parseEther("50")}`;
      const eventCtx = createEventContext(path, execContext);
      const response = await pagesFunction(eventCtx);
      await waitOnExecutionContext(execContext);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(card18597);
    });

    it("should respond with correct payment card for sandbox", async () => {
      const execContext = createExecutionContext();
      const path = `/get-best-card?country=US&amount=${parseEther("50")}`;
      const eventCtx = createEventContext(path, execContext, true);
      const response = await pagesFunction(eventCtx);
      await waitOnExecutionContext(execContext);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(bestCard);
    });
  },
  { timeout: 20000 }
);
