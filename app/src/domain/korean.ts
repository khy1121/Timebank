/**
 * 한국어 조사 고르기. 이름이 바뀌는 문구(물건 이름, 은행 이름)에 쓴다.
 * 받침이 있으면 앞의 것(을·이·은·과), 없으면 뒤의 것(를·가·는·와).
 */

/** 마지막 글자에 받침이 있는가. 한글이 아니면(숫자·기호 등) 받침이 없는 것으로 본다 */
export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().replace(/[!?.,~\s"'”’)\]]+$/, '').slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}

/** 예: josa('털모자', '을', '를') → '털모자를' */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  return word + (hasFinalConsonant(word) ? withFinal : withoutFinal);
}
