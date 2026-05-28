import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getDb, getUsersCollectionName } from "@/lib/firebase-admin";
import { generateOtp } from "@/lib/otp";
import { normalizePhoneDigits } from "@/lib/phone";

export type UserStatus = "pending" | "verified";

type StoredUser = {
  name: string;
  phoneNumber: string;
  phoneLookupKey: string;
  otp: string;
  status: UserStatus;
  createdAt?: Timestamp;
  verifiedAt?: Timestamp | null;
};

function getUsersCollection() {
  return getDb().collection(getUsersCollectionName());
}

function toIsoString(value?: Timestamp | null) {
  return value ? value.toDate().toISOString() : null;
}

export async function createPendingUser(input: { name: string; phoneNumber: string }) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Name is required.");
  }

  const normalizedPhone = normalizePhoneDigits(input.phoneNumber);
  const phoneNumber = `+${normalizedPhone}`;
  const userId = crypto.randomUUID();
  const otp = generateOtp();

  await getUsersCollection().doc(userId).set({
    name,
    phoneNumber,
    phoneLookupKey: normalizedPhone,
    otp,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    verifiedAt: null,
  });

  return {
    userId,
    name,
    phoneNumber,
    otp,
    status: "pending" as const,
  };
}

export async function getUserStatus(userId: string) {
  const snapshot = await getUsersCollection().doc(userId).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as StoredUser;

  return {
    userId: snapshot.id,
    name: data.name,
    phoneNumber: data.phoneNumber,
    status: data.status,
    createdAt: toIsoString(data.createdAt),
    verifiedAt: toIsoString(data.verifiedAt),
  };
}

export async function verifyUserFromMessage(input: {
  userId: string;
  otp: string;
  senderPhoneNumber: string;
}) {
  const snapshot = await getUsersCollection().doc(input.userId).get();

  if (!snapshot.exists) {
    return { verified: false, reason: "not_found" as const };
  }

  const data = snapshot.data() as StoredUser;

  if (data.status === "verified") {
    return { verified: true, reason: "already_verified" as const };
  }

  if (data.phoneLookupKey !== normalizePhoneDigits(input.senderPhoneNumber)) {
    return { verified: false, reason: "phone_mismatch" as const };
  }

  if (data.otp !== input.otp) {
    return { verified: false, reason: "otp_mismatch" as const };
  }

  await snapshot.ref.update({
    status: "verified",
    verifiedAt: FieldValue.serverTimestamp(),
  });

  return { verified: true, reason: "verified" as const };
}
