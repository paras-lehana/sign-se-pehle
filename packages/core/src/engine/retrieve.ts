/**
 * Clause retrieval — BM25-lite ranking of clauses against a question.
 *
 * Responsibility: pick the clauses most relevant to a question for offline answers
 * and for trimming what is sent to the model. Boundary: lexical only (no embeddings),
 * so it is deterministic and runs without network access.
 */

/** Standard BM25 parameters (Robertson & Zaragoza): term-frequency saturation and length normalisation. */
const BM25_K1 = 1.2;
const BM25_B = 0.75;
const MIN_TOKEN_LENGTH = 2;

/** Common English function words plus question words that match every clause. */
const STOPWORDS: ReadonlySet<string> = new Set(
  'a an and are as at be by can do does for from has have how i if in is it its me my of on or our shall should the their them there this to under upon was we what when where which who why will with would you your'.split(
    ' ',
  ),
);

/** Any clause-like record: model clauses, offline clauses and assembled clauses all fit. */
export interface RankableClause {
  readonly heading: string;
  readonly quote: string;
  readonly plainMeaning: string;
}

export interface RankedClause<T extends RankableClause> {
  readonly clause: T;
  readonly score: number;
}

/**
 * Lowercases, splits on non-letters/digits and drops stopwords and 1-letter tokens.
 * @example
 * tokenize('What is the Deposit?'); // ['deposit']
 */
export function tokenize(text: string): string[] {
  return Array.from(text.toLowerCase().matchAll(/[\p{L}\p{N}]+/gu), (match) => match[0]).filter(
    (token) => token.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(token),
  );
}

/**
 * Ranks clauses by BM25 relevance to the question, highest first (stable on ties).
 * @example
 * rankClauses(clauses, 'Can the landlord keep my deposit?', 3)[0]?.clause.heading; // 'Security deposit'
 */
export function rankClauses<T extends RankableClause>(clauses: readonly T[], question: string, limit: number): RankedClause<T>[] {
  const terms = [...new Set(tokenize(question))];
  const docs = clauses.map((clause) => tokenize(`${clause.heading} ${clause.quote} ${clause.plainMeaning}`));
  const count = docs.length;
  if (count === 0 || limit <= 0) return [];
  const averageLength = docs.reduce((sum, doc) => sum + doc.length, 0) / count || 1;
  const documentFrequency = new Map(terms.map((term) => [term, docs.filter((doc) => doc.includes(term)).length]));
  const ranked = clauses.map((clause, index) => {
    const doc = docs[index] ?? [];
    const score = terms.reduce((sum, term) => {
      const frequency = doc.filter((token) => token === term).length;
      if (frequency === 0) return sum;
      const df = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (count - df + 0.5) / (df + 0.5));
      const norm = frequency + BM25_K1 * (1 - BM25_B + (BM25_B * doc.length) / averageLength);
      return sum + (idf * frequency * (BM25_K1 + 1)) / norm;
    }, 0);
    return { clause, score };
  });
  return ranked.sort((a, b) => b.score - a.score).slice(0, limit);
}
