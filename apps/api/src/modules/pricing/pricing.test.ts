import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteDelivery } from "./pricing.service";

describe("pricing", () => {
  it("prices a delivery from weight without using a client amount", () => {
    const quote = quoteDelivery(2);
    assert.equal(quote.amount, "30.00");
    assert.equal(quote.currency, process.env.PAYMENT_CURRENCY || "MAD");
    assert.equal(quote.baseFee, "20.00");
    assert.equal(quote.perKg, "5.00");
  });

  it("rejects a non-positive weight", () => {
    assert.throws(() => quoteDelivery(0), /Weight must be greater than 0/);
  });
});
