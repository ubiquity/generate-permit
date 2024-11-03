import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { setupServer, SetupServerApi } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { onRequest as pagesFunction } from "../../functions/post-order";
import { httpMocks } from "../fixtures/http-mocks";
import minedTx from "../fixtures/post-order/mined-tx.json";
import orderCard13959 from "../fixtures/post-order/order-card-13959.json";
import orderCard18597 from "../fixtures/post-order/order-card-18597.json";
import receipt from "../fixtures/post-order/receipt.json";
import { getEventContext as createEventContext, TESTS_BASE_URL } from "./helpers";

describe("Post order for a payment card", () => {
  let server: SetupServerApi;
  let execContext: ExecutionContext;

  beforeAll(async () => {
    await initMocks();
    execContext = createExecutionContext();
    try {
      server = setupServer(...httpMocks);
      server.listen({ onUnhandledRequest: "error" });
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

  it("should post order on production", async () => {
    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: "permit",
        chainId: 31337,
        txHash: "0xac3485ce523faa13970412a89ef42d10939b44abd33cbcff1ed84cb566a3a3d5",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(orderCard18597);
  });

  it("should return err for ordering card that is not best suited", async () => {
    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: "permit",
        chainId: 31337,
        txHash: "0xac3485ce523faa13970412a89ef42d10939b44abd33cbcff1ed84cb566a3a3d5",
        productId: 18732,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "There was an error while processing your request." });
  });

  it("should post order on sandbox", async () => {
    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: "permit",
        chainId: 31337,
        txHash: "0xac3485ce523faa13970412a89ef42d10939b44abd33cbcff1ed84cb566a3a3d5",
        productId: 13959,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext, true);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(orderCard13959);
  });
});

async function initMocks() {
  const helpers = await import("../../shared/helpers");
  vi.spyOn(helpers, "getFastestRpcUrl").mockImplementation(async () => {
    return "http://127.0.0.1:8545";
  });

  const providers = await import("@ethersproject/providers");
  providers.JsonRpcProvider.prototype.getTransactionReceipt = vi.fn().mockImplementation(async () => {
    return receipt;
  });
  providers.JsonRpcProvider.prototype.getTransaction = vi.fn().mockImplementation(async () => {
    return minedTx;
  });
}
