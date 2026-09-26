/**
 * Offline question answering over one document.
 *
 * Responsibility: answer "where does the document talk about X?" by ranking clauses
 * with BM25 and quoting the best matches; route advice-seeking questions to a lawyer.
 * Boundary: extractive only — it never composes claims the document does not contain.
 */
import { rankClauses, type RankableClause } from '../engine/retrieve.js';
import type { AskModelOutput } from '../genai/model-output.js';
import type { AskAnswerType } from '../schemas/features.js';
import { classifyCategory } from './classify.js';
import { segmentClauses, verbatimPrefix } from './segment.js';
import { CATEGORY_MEANING } from './templates.js';

export interface OfflineAskInput {
  readonly text: string;
  readonly question: string;
  /** Clauses from an earlier analysis; when absent the text is segmented afresh. */
  readonly clauses?: readonly RankableClause[];
}

/** Questions asking for a decision or a prediction need a lawyer, not a document search. */
const ADVICE_PATTERN =
  /\b(?:should i|shall i|do i need to|can i sue|will i win|is (?:this|it|that) (?:legal|valid|enforceable|fair)|is this a good|must i sign|what should i do)\b|\bsue\b/i;

/** Two quotes are enough to ground an extractive answer. */
const MAX_OFFLINE_CITATIONS = 2;
/** Citations are shortened so the answer panel stays readable. */
const MAX_CITATION_CHARS = 300;

const FOLLOW_UPS = ['What happens if I leave early?', 'How much money is at stake?', 'What notice do I need to give?'];

function retrieveNote(type: AskAnswerType, heading: string | undefined): string {
  const where = heading === undefined || heading === '' ? 'the quoted part' : `the "${heading}" part`;
  switch (type) {
    case 'needs-lawyer':
      return `This question needs a lawyer's view; Sign Se Pehle shares information, not legal advice. The most relevant text is ${where} of the document. Consider asking a lawyer or free legal aid (NALSA helpline 15100).`;
    case 'not-in-document':
      return 'The document does not seem to talk about this. Consider asking the other party to confirm it in writing.';
    case 'answered':
      return `The closest match is ${where} of the document (offline search, explained in English).`;
  }
}

function offlineClauses(text: string): RankableClause[] {
  return segmentClauses(text).map((segment) => ({
    heading: segment.heading,
    quote: segment.quote,
    plainMeaning: CATEGORY_MEANING[classifyCategory(segment.quote)],
  }));
}

/**
 * Answers a question from the document text alone.
 * @example
 * askOffline({ text, question: 'What is the deposit?' }).answerType; // 'answered'
 */
export function askOffline(input: OfflineAskInput): AskModelOutput {
  const clauses = input.clauses ?? offlineClauses(input.text);
  const ranked = rankClauses(clauses, input.question, MAX_OFFLINE_CITATIONS).filter((entry) => entry.score > 0);
  const citedQuotes = ranked.map((entry) => verbatimPrefix(entry.clause.quote, MAX_CITATION_CHARS));
  if (ADVICE_PATTERN.test(input.question)) {
    return {
      answer: retrieveNote('needs-lawyer', ranked[0]?.clause.heading),
      citedQuotes,
      answerType: 'needs-lawyer',
      followUps: FOLLOW_UPS,
    };
  }
  const best = ranked[0];
  if (best === undefined) {
    return { answer: retrieveNote('not-in-document', undefined), citedQuotes: [], answerType: 'not-in-document', followUps: FOLLOW_UPS };
  }
  return {
    answer: `${retrieveNote('answered', best.clause.heading)} ${best.clause.plainMeaning}`,
    citedQuotes,
    answerType: 'answered',
    followUps: FOLLOW_UPS,
  };
}
