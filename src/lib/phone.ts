export function normalizePhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    throw new Error("Phone numbers must contain between 7 and 15 digits.");
  }

  return digits;
}

export function formatE164PhoneNumber(value: string) {
  return `+${normalizePhoneDigits(value)}`;
}

export function formatWaMePhoneNumber(value: string) {
  return normalizePhoneDigits(value);
}
