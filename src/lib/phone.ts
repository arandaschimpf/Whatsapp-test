import { ValidationError } from "@/lib/errors";

export function normalizePhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    throw new ValidationError(
      `Phone numbers must contain between 7 and 15 digits in international format, but received ${digits.length} digits.`,
    );
  }

  return digits;
}

export function formatWaMePhoneNumber(value: string) {
  return normalizePhoneDigits(value);
}
