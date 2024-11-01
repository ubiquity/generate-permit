import { parseEther } from "@ethersproject/units";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { setupServer, SetupServerApi } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { onRequest as pagesFunction } from "../../functions/get-best-card";
import bestCard from "../fixtures/get-best-card/best-card-sandbox.json";
import card18597 from "../fixtures/get-best-card/card-18597.json";
import { httpMocks } from "../fixtures/http-mocks";
import { getEventContext as createEventContext } from "./helpers";

describe(
  "Get best payment card",
  () => {
    let server: SetupServerApi;
    let execContext: ExecutionContext;

    beforeAll(() => {
      execContext = createExecutionContext();
      try {
        server = setupServer(...httpMocks);
        server.listen();
      } catch (e) {
        console.log(`Error starting msw server: ${e}`);
      }
    });

    afterEach(() => {
      server.resetHandlers();
    });

    afterAll(() => {
      server.close();
    });

    it("should respond with correct payment card on production", async () => {
      const path = `/get-best-card?country=US&amount=${parseEther("50")}`;
      const eventCtx = createEventContext(path, execContext);
      const response = await pagesFunction(eventCtx);
      await waitOnExecutionContext(execContext);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(card18597);
    });

    it("should respond with US International Mastercard for Malta as fallback", async () => {
      const path = `/get-best-card?country=MT&amount=${parseEther("50")}`;
      const eventCtx = createEventContext(path, execContext);
      const response = await pagesFunction(eventCtx);
      await waitOnExecutionContext(execContext);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(card18597);
    });

    it("should respond with no payment card for unsupported country", async () => {
      const path = `/get-best-card?country=PK&amount=${parseEther("50")}`;
      const eventCtx = createEventContext(path, execContext);
      const response = await pagesFunction(eventCtx);
      await waitOnExecutionContext(execContext);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: "There are no gift cards available." });
    });

    it("should respond with no payment card for low amount permit", async () => {
      const path = `/get-best-card?country=US&amount=${parseEther("1")}`;
      const eventCtx = createEventContext(path, execContext);
      const response = await pagesFunction(eventCtx);
      await waitOnExecutionContext(execContext);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: "There are no gift cards available." });
    });

    it("should respond with correct payment card for sandbox", async () => {
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
