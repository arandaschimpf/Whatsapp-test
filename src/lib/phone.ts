export function normalizePhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    throw new Error(
      `Phone numbers must contain between 7 and 15 digits, but received ${digits.length} digits.`,
    );
  }

  return digits;
}

export function formatWaMePhoneNumber(value: string) {
  return normalizePhoneDigits(value);
}
