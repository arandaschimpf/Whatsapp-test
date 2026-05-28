export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function buildVerificationMessage(userId: string, otp: string) {
  return `VERIFY\nUSER_ID: ${userId}\nOTP: ${otp}`;
}

export function parseVerificationMessage(body: string) {
  const labelledUserId = body.match(/user[\s_-]*id\s*[:=-]\s*([a-z0-9-]+)/i);
  const labelledOtp = body.match(/\botp\b\s*[:=-]\s*(\d{4,8})/i);

  if (labelledUserId?.[1] && labelledOtp?.[1]) {
    return {
      userId: labelledUserId[1],
      otp: labelledOtp[1],
    };
  }

  const compact = body.match(/verify\s+([a-z0-9-]{8,})\s+(\d{4,8})/i);

  if (compact?.[1] && compact?.[2]) {
    return {
      userId: compact[1],
      otp: compact[2],
    };
  }

  return null;
}
