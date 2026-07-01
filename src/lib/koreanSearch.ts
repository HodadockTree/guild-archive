const KOREAN_SYLLABLE_START = 0xac00;
const KOREAN_SYLLABLE_END = 0xd7a3;
const KOREAN_INITIALS = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

export function getKoreanInitials(text: string) {
  return Array.from(text)
    .map((character) => {
      const codePoint = character.codePointAt(0);

      if (
        codePoint === undefined ||
        codePoint < KOREAN_SYLLABLE_START ||
        codePoint > KOREAN_SYLLABLE_END
      ) {
        return character.toLowerCase();
      }

      const initialIndex = Math.floor(
        (codePoint - KOREAN_SYLLABLE_START) / (21 * 28),
      );
      return KOREAN_INITIALS[initialIndex] ?? character;
    })
    .join("");
}

export function matchesMemberKeyword(nickname: string, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return true;
  }

  const normalizedNickname = nickname.toLowerCase();

  return (
    nickname.includes(keyword.trim()) ||
    normalizedNickname.includes(normalizedKeyword) ||
    getKoreanInitials(nickname).includes(normalizedKeyword)
  );
}
