import { TransactionDescription } from "@ethersproject/abi";
import { TransactionReceipt, TransactionResponse } from "@ethersproject/providers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { setupServer, SetupServerApi } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, MockInstance, vi } from "vitest";
import { onRequest as pagesFunction } from "../../functions/post-order";
import { httpMocks } from "../fixtures/http-mocks";
import minedTxForMockedParse from "../fixtures/post-order/mined-tx-for-mocked-parse.json";
import minedTxNotPermit2 from "../fixtures/post-order/mined-tx-not-permit2.json";
import minedTxPermitExpired from "../fixtures/post-order/mined-tx-permit-expired.json";
import minedTxTooHigh from "../fixtures/post-order/mined-tx-too-high.json";
import minedTxTooLow from "../fixtures/post-order/mined-tx-too-low.json";
import minedTxUusd from "../fixtures/post-order/mined-tx-uusd.json";
import minedTxGeneric from "../fixtures/post-order/mined-tx.json";
import orderCard13959 from "../fixtures/post-order/order-card-13959.json";
import orderCard18597 from "../fixtures/post-order/order-card-18597.json";
import parsedTxUusdWrongMethod from "../fixtures/post-order/parsed-tx-uusd-wrong-method.json";
import parsedTxUusdWrongTreasury from "../fixtures/post-order/parsed-tx-uusd-wrong-treasury.json";
import parsedTxWrongMethod from "../fixtures/post-order/parsed-tx-wrong-method.json";
import parsedTxWrongToken from "../fixtures/post-order/parsed-tx-wrong-token.json";
import parsedTxWrongTreasury from "../fixtures/post-order/parsed-tx-wrong-treasury.json";
import receiptNotPermit2 from "../fixtures/post-order/receipt-not-permit2.json";
import receiptPermitExpired from "../fixtures/post-order/receipt-permit-expired.json";
import receiptTooHigh from "../fixtures/post-order/receipt-too-high.json";
import receiptTooLow from "../fixtures/post-order/receipt-too-low.json";
import receiptTxForMockedParse from "../fixtures/post-order/receipt-tx-for-mocked-parse.json";
import receiptUusd from "../fixtures/post-order/receipt-tx-uusd.json";
import receiptGeneric from "../fixtures/post-order/receipt.json";
import { getEventContext as createEventContext, TESTS_BASE_URL } from "./shared-utils";

describe("Post order for a payment card", () => {
  let server: SetupServerApi;
  let execContext: ExecutionContext;
  let consoleMock: MockInstance;
  const generalError = { message: "Transaction is not authorized to purchase gift card." };
  const uusd = "ubiquity-dollar";

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
    consoleMock = vi.spyOn(console, "error").mockImplementationOnce(() => undefined);
  });

  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  it("should post order on production with permit", async () => {
    await initMocks();
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
    await initMocks();
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
    await initMocks();
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
    await initMocks(receiptTooLow, minedTxTooLow);

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
    await initMocks(receiptTooHigh, minedTxTooHigh);

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
    await initMocks(receiptPermitExpired, minedTxPermitExpired);
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
    await initMocks(receiptNotPermit2, minedTxNotPermit2);

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
    expect(consoleMock).toHaveBeenLastCalledWith(
      "Given transaction hash is not an interaction with permit2Address",
      "txReceipt.to=0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
      "permit2Address=0x000000000022D473030F116dDEE9F6B43aC78BA3"
    );
  });

  it("should return error with tx hash that is not call to permitTransferFrom", async () => {
    await initMocks(receiptTxForMockedParse, minedTxForMockedParse, parsedTxWrongMethod);

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
    await initMocks(receiptTxForMockedParse, minedTxForMockedParse, parsedTxWrongToken);

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

  it("should return error with tx hash that transfers to wrong treasury", async () => {
    await initMocks(receiptTxForMockedParse, minedTxForMockedParse, parsedTxWrongTreasury);
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

  it("should post order with uusd", async () => {
    await initMocks(receiptUusd, minedTxUusd);
    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: uusd,
        chainId: 31337,
        txHash: "0xdf1bf8b6d679e406f43b57692a2dcbb450e38d5de72e5199d836b701d0a4306f",
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

  it("should return err with uusd for unsupported chain", async () => {
    await initMocks(receiptUusd, minedTxUusd);
    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: uusd,
        chainId: 25,
        txHash: "0xdf1bf8b6d679e406f43b57692a2dcbb450e38d5de72e5199d836b701d0a4306f",
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

  it("should return err with uusd for wrong method call", async () => {
    await initMocks(receiptUusd, minedTxUusd, parsedTxUusdWrongMethod);
    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: uusd,
        chainId: 31337,
        txHash: "0xdf1bf8b6d679e406f43b57692a2dcbb450e38d5de72e5199d836b701d0a4306f",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Given transaction is not a token transfer" });
  });

  it("should return err with uusd for wrong method call", async () => {
    await initMocks(receiptUusd, minedTxUusd, parsedTxUusdWrongMethod);
    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: uusd,
        chainId: 31337,
        txHash: "0xdf1bf8b6d679e406f43b57692a2dcbb450e38d5de72e5199d836b701d0a4306f",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Given transaction is not a token transfer" });
  });

  it("should return err with uusd for wrong treasury", async () => {
    await initMocks(receiptUusd, minedTxUusd, parsedTxUusdWrongTreasury);
    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: uusd,
        chainId: 31337,
        txHash: "0xdf1bf8b6d679e406f43b57692a2dcbb450e38d5de72e5199d836b701d0a4306f",
        productId: 18597,
        country: "US",
      }),
    }) as Request<unknown, IncomingRequestCfProperties<unknown>>;

    const eventCtx = createEventContext(request, execContext);
    const response = await pagesFunction(eventCtx);
    await waitOnExecutionContext(execContext);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Given transaction is not a token transfer to treasury address" });
  });

  it("should post order on sandbox with uusd", async () => {
    await initMocks(receiptUusd, minedTxUusd);
    const request = new Request(`${TESTS_BASE_URL}/post-order`, {
      method: "POST",
      body: JSON.stringify({
        type: uusd,
        chainId: 31337,
        txHash: "0xdf1bf8b6d679e406f43b57692a2dcbb450e38d5de72e5199d836b701d0a4306f",
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

  it("should post order on sandbox", async () => {
    await initMocks();
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

async function initMocks(receipt: object = receiptGeneric, minedTx: object = minedTxGeneric, parsedTx?: object) {
  const helpers = await import("../../shared/helpers");
  vi.spyOn(helpers, "getFastestRpcUrl").mockImplementation(async () => {
    return "http://127.0.0.1:8545";
  });

  const providers = await import("@ethersproject/providers");
  vi.spyOn(providers.JsonRpcProvider.prototype, "getTransactionReceipt").mockImplementationOnce(async () => {
    return receipt as TransactionReceipt;
  });
  vi.spyOn(providers.JsonRpcProvider.prototype, "getTransaction").mockImplementationOnce(async () => {
    return minedTx as TransactionResponse;
  });

  if (parsedTx) {
    const { Interface } = await import("@ethersproject/abi");
    vi.spyOn(Interface.prototype, "parseTransaction").mockImplementationOnce(() => {
      return parsedTx as TransactionDescription;
    });
  }
}
