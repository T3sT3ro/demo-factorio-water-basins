// Generate letter sequence: a, b, c, ..., z, aa, ab, ac, ...
/**
 * Generate a letter sequence for basin naming (A, B, C, ..., Z, AA, AB, etc.)
 * @param {number} index - The index to convert to letters
 * @returns {string} Letter sequence string
 */
export function generateLetterSequence(index) {
  let result = "";
  let num = index;

  do {
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);

  return result;
}
