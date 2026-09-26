/**
 * Questions to ask a lawyer, with a copy-to-clipboard button.
 *
 * Responsibility: turn the analysis into a ready list for a lawyer or legal aid visit.
 * Boundary: the clipboard may be unavailable (insecure context, permissions), so the
 * outcome is announced either way and the list stays selectable.
 */
import { type ReactElement, useState } from 'react';
import { ReportSection } from './ReportSection';

interface LawyerQuestionsProps {
  readonly questions: readonly string[];
}

export function LawyerQuestions({ questions }: LawyerQuestionsProps): ReactElement | null {
  const [status, setStatus] = useState('');
  if (questions.length === 0) return null;

  async function copy(): Promise<void> {
    const text = questions.map((question, index) => `${index + 1}. ${question}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Questions copied.');
    } catch {
      setStatus('Copy is not available here — please select the questions instead.');
    }
  }

  return (
    <ReportSection
      id="lawyer-questions"
      title="Questions to ask a lawyer"
      intro="Free legal aid is available through NALSA (call 15100) and Tele-Law."
    >
      <ol className="question-list">
        {questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ol>
      <button type="button" className="button button--secondary" onClick={() => void copy()}>
        Copy questions
      </button>
      <p className="muted" role="status">
        {status}
      </p>
    </ReportSection>
  );
}
