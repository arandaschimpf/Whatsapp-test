import { NextResponse } from "next/server";

import { buildVerificationMessage } from "@/lib/otp";
import { formatWaMePhoneNumber } from "@/lib/phone";
import { createPendingUser } from "@/lib/users";

export const runtime = "nodejs";

function getWhatsAppDestinationNumber() {
  const value = process.env.WHATSAPP_DESTINATION_PHONE_NUMBER;

  if (!value) {
    throw new Error("WHATSAPP_DESTINATION_PHONE_NUMBER is not configured.");
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      phoneNumber?: string;
    };

    const user = await createPendingUser({
      name: body.name ?? "",
      phoneNumber: body.phoneNumber ?? "",
    });

    const message = buildVerificationMessage(user.userId, user.otp);
    const waLink = `https://wa.me/${formatWaMePhoneNumber(getWhatsAppDestinationNumber())}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      ...user,
      message,
      waLink,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register user.";
    const status = /required|configured|Phone numbers must contain/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
