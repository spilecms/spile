/**
 * Webhook HMAC-SHA256 Signature Verification
 * Built on standard Web Crypto (crypto.subtle) - works in Node 18+, Edge, Bun, Deno, and browsers.
 */

import type { VerifyWebhookOptions } from "./types/index.js";

/**
 * Computes the HMAC-SHA256 signature for a payload string using a secret key.
 * Returns the hex-encoded signature string.
 */
export async function computeHmacSha256(
	payload: string,
	secret: string,
): Promise<string> {
	const encoder = new TextEncoder();
	const keyData = encoder.encode(secret);
	const messageData = encoder.encode(payload);

	const key = await crypto.subtle.importKey(
		"raw",
		keyData,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
	const hashArray = Array.from(new Uint8Array(signatureBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

/**
 * Verifies an incoming Spile CMS webhook signature.
 *
 * @example
 * ```ts
 * const isValid = await verifyWebhookSignature({
 *   payload: rawBody,
 *   signature: req.headers.get("x-spile-signature"),
 *   secret: process.env.SPILE_WEBHOOK_SECRET!,
 * });
 * ```
 */
export async function verifyWebhookSignature(
	options: VerifyWebhookOptions,
): Promise<boolean> {
	const { payload, signature, secret } = options;

	if (!payload || !signature || !secret) {
		return false;
	}

	// Normalize signature by stripping optional "sha256=" prefix
	const expectedSig = signature.startsWith("sha256=")
		? signature.slice(7)
		: signature;

	const computedSig = await computeHmacSha256(payload, secret);

	return constantTimeCompare(
		expectedSig.toLowerCase(),
		computedSig.toLowerCase(),
	);
}
