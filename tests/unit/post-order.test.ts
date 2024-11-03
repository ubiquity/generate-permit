import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { setupServer, SetupServerApi } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { onRequest as pagesFunction } from "../../functions/post-order";
import { httpMocks } from "../fixtures/http-mocks";
import minedTx from "../fixtures/post-order/mined-tx.json";
import order from "../fixtures/post-order/order.json";
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

  it.only("should post order on sandbox", async () => {
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
    expect(await response.json()).toEqual(order);
  });
});

async function initMocks() {
  vi.mock("../../shared/helpers");
  const helpers = await import("../../shared/helpers");
  helpers.getFastestRpcUrl = vi.fn().mockImplementation(() => {
    return "http://127.0.0.1:8545";
  });

  vi.mock("@ethersproject/providers");
  const providers = await import("@ethersproject/providers");
  providers.JsonRpcProvider.prototype.getTransactionReceipt = vi.fn().mockImplementation(async () => {
    return receipt;
  });
  providers.JsonRpcProvider.prototype.getTransaction = vi.fn().mockImplementation(async () => {
    return minedTx;
  });
}
