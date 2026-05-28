import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { parseVerificationMessage } from "@/lib/otp";
import { verifyUserFromMessage } from "@/lib/users";

export const runtime = "nodejs";

type IncomingMessage = {
  from: string;
  body: string;
};

function verifyMetaSignature(signature: string | null, rawBody: string) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    return process.env.NODE_ENV !== "production";
  }

  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signature.slice("sha256=".length);

  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
}

function extractIncomingMessages(payload: unknown) {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { entry?: unknown[] }).entry)) {
    return [] as IncomingMessage[];
  }

  const messages: IncomingMessage[] = [];

  for (const entry of (payload as { entry: unknown[] }).entry) {
    if (!entry || typeof entry !== "object" || !Array.isArray((entry as { changes?: unknown[] }).changes)) {
      continue;
    }

    for (const change of (entry as { changes: unknown[] }).changes) {
      const value = (change as { value?: unknown }).value;

      if (!value || typeof value !== "object" || !Array.isArray((value as { messages?: unknown[] }).messages)) {
        continue;
      }

      for (const message of (value as { messages: unknown[] }).messages) {
        const textBody =
          message &&
          typeof message === "object" &&
          typeof (message as { text?: { body?: unknown } }).text?.body === "string"
            ? (message as { text: { body: string } }).text.body
            : null;
        const from =
          message && typeof message === "object" && typeof (message as { from?: unknown }).from === "string"
            ? (message as { from: string }).from
            : null;

        if (textBody && from) {
          messages.push({
            from,
            body: textBody,
          });
        }
      }
    }
  }

  return messages;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    challenge &&
    token &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyMetaSignature(request.headers.get("x-hub-signature-256"), rawBody)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as unknown;
  const messages = extractIncomingMessages(payload);

  await Promise.all(
    messages.map(async (message) => {
      const parsedMessage = parseVerificationMessage(message.body);

      if (!parsedMessage) {
        return;
      }

      await verifyUserFromMessage({
        userId: parsedMessage.userId,
        otp: parsedMessage.otp,
        senderPhoneNumber: message.from,
      });
    }),
  );

  return NextResponse.json({ received: true });
}
