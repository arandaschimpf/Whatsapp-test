import crypto from "node:crypto";

const USER_ID_PATTERN = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";

export function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function buildVerificationMessage(userId: string, otp: string) {
  return `VERIFY\nUSER_ID: ${userId}\nOTP: ${otp}`;
}

export function parseVerificationMessage(body: string) {
  const labelledUserId = body.match(new RegExp(`user[\s_-]*id\s*[:=-]\s*${USER_ID_PATTERN}`, "i"));
  const labelledOtp = body.match(/\botp\b\s*[:=-]\s*(\d{6})/);

  if (labelledUserId?.[1] && labelledOtp?.[1]) {
    return {
      userId: labelledUserId[1],
      otp: labelledOtp[1],
    };
  }

  const compact = body.match(new RegExp(`verify\s+${USER_ID_PATTERN}\s+(\d{6})`, "i"));

  if (compact?.[1] && compact?.[2]) {
    return {
      userId: compact[1],
      otp: compact[2],
    };
  }

  return null;
}
