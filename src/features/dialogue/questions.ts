/** A dialogue question: plain text (answered by optional typing), or text with tap-to-answer
 * choices (typing still available behind "직접 쓸게요"). */
export type DialogueQuestion = string | { text: string; choices: string[] };

export const questionText = (q: DialogueQuestion) => (typeof q === 'string' ? q : q.text);
