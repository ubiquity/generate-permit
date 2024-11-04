import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { setupServer, SetupServerApi } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequest as pagesFunction } from "../../functions/post-order";
import { httpMocks } from "../fixtures/http-mocks";
import minedTxForMockedParse from "../fixtures/post-order/mined-tx-for-mocked-parse.json";
import minedTxNotPermit2 from "../fixtures/post-order/mined-tx-not-permit2.json";
import minedTxPermitExpired from "../fixtures/post-order/mined-tx-permit-expired.json";
import minedTxTooHigh from "../fixtures/post-order/mined-tx-too-high.json";
import minedTxTooLow from "../fixtures/post-order/mined-tx-too-low.json";
import minedTx from "../fixtures/post-order/mined-tx.json";
import orderCard18597 from "../fixtures/post-order/order-card-18597.json";
import orderCard13959 from "../fixtures/post-order/order-card-13959.json";
import parsedTxWrongMethod from "../fixtures/post-order/parsed-tx-wrong-method.json";
import parsedTxWrongToken from "../fixtures/post-order/parsed-tx-wrong-token.json";
import parsedTxWrongTreasury from "../fixtures/post-order/parsed-tx-wrong-treasury.json";
import receiptNotPermit2 from "../fixtures/post-order/receipt-not-permit2.json";
import receiptPermitExpired from "../fixtures/post-order/receipt-permit-expired.json";
import receiptTooHigh from "../fixtures/post-order/receipt-too-high.json";
import receiptTooLow from "../fixtures/post-order/receipt-too-low.json";
import receiptTxForMockedParse from "../fixtures/post-order/receipt-tx-for-mocked-parse.json";
import receipt from "../fixtures/post-order/receipt.json";
import { getEventContext as createEventContext, TESTS_BASE_URL } from "./helpers";

describe("Post order for a payment card", () => {
  let server: SetupServerApi;
  let execContext: ExecutionContext;
  const consoleMock = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const generalError = { message: "Transaction is not authorized to purchase gift card." };

  beforeAll(async () => {
    execContext = createExecutionContext();
    try {
      server = setupServer(...httpMocks);
      server.listen({ onUnhandledRequest: "error" });
    } catch (e) {
      console.log(`Error starting msw server: ${e}`);
    }
  });

  beforeEach(async () => {
    await initMocks();
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

  it("should return err for ordering card for unsupported blockchain", async () => {
    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: "permit",
        chainId: 25,
        txHash: "0xac3485ce523faa13970412a89ef42d10939b44abd33cbcff1ed84cb566a3a3d5",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Unsupported chain" });
  });

  it("should return err for ordering card with too low permit amount", async () => {
    const providers = await import("@ethersproject/providers");
    providers.JsonRpcProvider.prototype.getTransactionReceipt = vi.fn().mockImplementation(async () => {
      return receiptTooLow;
    });
    providers.JsonRpcProvider.prototype.getTransaction = vi.fn().mockImplementation(async () => {
      return minedTxTooLow;
    });

    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: "permit",
        chainId: 31337,
        txHash: "0xf21e2ce3a5106c6ddd0d70c8925965878a2604ed042990be49b05773196bb6b4",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Your reward amount is either too high or too low to buy this card." });
  });

  it("should return err for ordering card with too high permit amount", async () => {
    const providers = await import("@ethersproject/providers");
    providers.JsonRpcProvider.prototype.getTransactionReceipt = vi.fn().mockImplementation(async () => {
      return receiptTooHigh;
    });
    providers.JsonRpcProvider.prototype.getTransaction = vi.fn().mockImplementation(async () => {
      return minedTxTooHigh;
    });

    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: "permit",
        chainId: 31337,
        txHash: "0x9c9fd8cde45957741c16f0af4ab191d9b010c6f95d351df8c023e14a2ac80aa2",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Your reward amount is either too high or too low to buy this card." });
  });

  it("should return err for ordering card with expired permit", async () => {
    const providers = await import("@ethersproject/providers");
    providers.JsonRpcProvider.prototype.getTransactionReceipt = vi.fn().mockImplementation(async () => {
      return receiptPermitExpired;
    });
    providers.JsonRpcProvider.prototype.getTransaction = vi.fn().mockImplementation(async () => {
      return minedTxPermitExpired;
    });

    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: "permit",
        chainId: 31337,
        txHash: "0xfac827e7448c6578f7a22f7f90ec64693ef54238164d50dd895567f382d3c0bb",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "The reward has expired." });
  });

  it("should return err order with tx hash that not permit2 interaction", async () => {
    const providers = await import("@ethersproject/providers");
    providers.JsonRpcProvider.prototype.getTransactionReceipt = vi.fn().mockImplementation(async () => {
      return receiptNotPermit2;
    });
    providers.JsonRpcProvider.prototype.getTransaction = vi.fn().mockImplementation(async () => {
      return minedTxNotPermit2;
    });

    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: "permit",
        chainId: 31337,
        txHash: "0xfac827e7448c6578f7a22f7f90ec64693ef54238164d50dd895567f382d3c0bb",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(generalError);
  });

  it("should return error with tx hash that is not call to permitTransferFrom", async () => {
    const providers = await import("@ethersproject/providers");
    providers.JsonRpcProvider.prototype.getTransactionReceipt = vi.fn().mockImplementation(async () => {
      return receiptTxForMockedParse;
    });
    providers.JsonRpcProvider.prototype.getTransaction = vi.fn().mockImplementation(async () => {
      return minedTxForMockedParse;
    });
    const { Interface } = await import("@ethersproject/abi");
    Interface.prototype.parseTransaction = vi.fn().mockImplementation(() => {
      return parsedTxWrongMethod;
    });

    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: "permit",
        chainId: 31337,
        txHash: "0xbef4c18032fbef0453f85191fb0fa91184b42d12ccc37f00eb7ae8c1d88a0233",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(generalError);
    expect(consoleMock).toHaveBeenLastCalledWith(
      "Given transaction hash is not call to contract function permitTransferFrom",
      "txParsed.functionFragment.name=permitTransferFromEdited"
    );
  });

  it("should return error with tx hash that transfers wrong token", async () => {
    const providers = await import("@ethersproject/providers");
    providers.JsonRpcProvider.prototype.getTransactionReceipt = vi.fn().mockImplementation(async () => {
      return receiptTxForMockedParse;
    });
    providers.JsonRpcProvider.prototype.getTransaction = vi.fn().mockImplementation(async () => {
      return minedTxForMockedParse;
    });
    const { Interface } = await import("@ethersproject/abi");
    Interface.prototype.parseTransaction = vi.fn().mockImplementation(() => {
      return parsedTxWrongToken;
    });

    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: "permit",
        chainId: 31337,
        txHash: "0xbef4c18032fbef0453f85191fb0fa91184b42d12ccc37f00eb7ae8c1d88a0233",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(generalError);
    expect(consoleMock).toHaveBeenLastCalledWith(
      "Given transaction hash is not transferring the required ERC20 token.",
      '{"transferredToken":"0x4ECaBa5870353805a9F068101A40E0f32ed605C6","requiredToken":"0xe91d153e0b41518a2ce8dd3d7944fa863463a97d"}'
    );
  });

  it.only("should return error with tx hash that transfers to wrong treasury", async () => {
    const providers = await import("@ethersproject/providers");
    providers.JsonRpcProvider.prototype.getTransactionReceipt = vi.fn().mockImplementation(async () => {
      return receiptTxForMockedParse;
    });
    providers.JsonRpcProvider.prototype.getTransaction = vi.fn().mockImplementation(async () => {
      return minedTxForMockedParse;
    });
    const { Interface } = await import("@ethersproject/abi");
    Interface.prototype.parseTransaction = vi.fn().mockImplementation(() => {
      return parsedTxWrongTreasury;
    });

    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: "permit",
        chainId: 31337,
        txHash: "0xbef4c18032fbef0453f85191fb0fa91184b42d12ccc37f00eb7ae8c1d88a0233",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(generalError);
    expect(consoleMock).toHaveBeenLastCalledWith(
      "Given transaction hash is not a token transfer to giftCardTreasuryAddress",
      "txParsed.args.transferDetails.to=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "giftCardTreasuryAddress=0xD51B09ad92e08B962c994374F4e417d4AD435189"
    );
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