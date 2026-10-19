import assert from "node:assert/strict";
import test from "node:test";
import { computeHmacSha256, verifyWebhookSignature } from "../dist/index.js";

test("Webhook Verification - verifies valid signature with sha256= prefix", async () => {
	const secret = "whsec_test_secret_123456";
	const payload = JSON.stringify({
		event: "post.published",
		id: "p-100",
		title: "Test Post",
	});

	const rawSignature = await computeHmacSha256(payload, secret);
	const headerSignature = `sha256=${rawSignature}`;

	const isValid = await verifyWebhookSignature({
		payload,
		signature: headerSignature,
		secret,
	});

	assert.equal(isValid, true);
});

test("Webhook Verification - verifies valid signature without prefix", async () => {
	const secret = "whsec_test_secret_123456";
	const payload = JSON.stringify({ event: "doc.updated", id: "d-50" });

	const rawSignature = await computeHmacSha256(payload, secret);

	const isValid = await verifyWebhookSignature({
		payload,
		signature: rawSignature,
		secret,
	});

	assert.equal(isValid, true);
});

test("Webhook Verification - rejects forged or invalid signature", async () => {
	const secret = "whsec_test_secret_123456";
	const payload = JSON.stringify({ event: "post.published" });
	const forgedSignature =
		"sha256=0000000000000000000000000000000000000000000000000000000000000000";

	const isValid = await verifyWebhookSignature({
		payload,
		signature: forgedSignature,
		secret,
	});

	assert.equal(isValid, false);
});

test("Webhook Verification - rejects mismatched secret", async () => {
	const secretA = "correct_secret";
	const secretB = "wrong_secret";
	const payload = JSON.stringify({ event: "post.deleted" });

	const signatureA = await computeHmacSha256(payload, secretA);

	const isValid = await verifyWebhookSignature({
		payload,
		signature: signatureA,
		secret: secretB,
	});

	assert.equal(isValid, false);
});
