/**
 * Generate a letter sequence form numerical value (A, B, C, ..., Z, AA, AB, etc.)
 * @param {number} index - The index to convert to letters
 * @returns {string} Letter sequence string
 */
export function generateLetterSequence(index: number): string {
  let result = "";
  let num = index;

  do {
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);

  return result;
}
