import type { GuildMemberGender } from "@/src/types";

export const guildMemberGenderLabels: Record<GuildMemberGender, string> = {
  female: "여성",
  male: "남성",
  other: "기타·비공개",
};

const MIN_BIRTH_YEAR = 1900;

export function parseBirthYearInput(value: string, currentYear: number) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { valid: true as const, birthYear: undefined };
  }

  if (!/^\d{2}$|^\d{4}$/.test(trimmedValue)) {
    return {
      valid: false as const,
      error: "출생연도는 두 자리 또는 네 자리 숫자로 입력해 주세요.",
    };
  }

  const numericValue = Number(trimmedValue);
  const currentTwoDigitYear = currentYear % 100;
  const birthYear =
    trimmedValue.length === 2
      ? numericValue <= currentTwoDigitYear
        ? 2000 + numericValue
        : 1900 + numericValue
      : numericValue;

  if (birthYear > currentYear) {
    return {
      valid: false as const,
      error: "미래 출생연도는 저장할 수 없습니다.",
    };
  }

  if (birthYear < MIN_BIRTH_YEAR) {
    return {
      valid: false as const,
      error: `${MIN_BIRTH_YEAR}년 이전 출생연도는 저장할 수 없습니다.`,
    };
  }

  return { valid: true as const, birthYear };
}

export function getMemberAgeGroup(birthYear: number, currentYear: number) {
  const referenceAge = currentYear - birthYear;

  if (referenceAge < 0) {
    return undefined;
  }

  return `${Math.floor(referenceAge / 10) * 10}대`;
}

export function getMemberDemographicsLabel(
  birthYear: number | undefined,
  currentYear: number,
) {
  if (!birthYear) {
    return undefined;
  }

  const ageGroup = getMemberAgeGroup(birthYear, currentYear);
  return ageGroup ? `${ageGroup} · ${birthYear}년생` : `${birthYear}년생`;
}
