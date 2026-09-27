/**
 * Next steps: where to get help, free legal aid, and the deadlines that matter.
 *
 * Responsibility: bring together the reply countdown (legal notices), the official forums
 * for this kind of document, the nearest legal aid office on Google Maps, a private legal
 * aid check and the limitation reminder. Boundary: information and links only — every
 * calculation here runs in the browser and nothing the reader enters is sent anywhere.
 */
import type { ReactElement } from 'react';
import { buildMapsSearchUrl } from '@sign-se-pehle/core';
import type { Analysis } from '../../../lib/api';
import { FeaturePanel } from '../common/FeaturePanel';
import { ForumRoutes } from './ForumRoutes';
import { LegalAidCheck } from './LegalAidCheck';
import { LimitationReminder } from './LimitationReminder';
import { ReplyDeadline } from './ReplyDeadline';

interface NextStepsPanelProps {
  readonly analysis: Analysis;
}

/** Google Maps resolves "near me" from the reader's own location in their Maps app. */
const LEGAL_AID_MAPS_QUERY = 'District Legal Services Authority near me';

export function NextStepsPanel({ analysis }: NextStepsPanelProps): ReactElement {
  return (
    <FeaturePanel
      id="next-steps"
      title="Next steps"
      intro="Where to get help, whether you qualify for free legal aid, and the time limits that matter."
    >
      <ReplyDeadline facts={analysis.facts} />
      <div className="next-steps__block">
        <h4>Where to go</h4>
        <ForumRoutes kind={analysis.kind} />
      </div>
      <div className="next-steps__block">
        <h4>Nearest free legal aid</h4>
        <p>
          Every district court has a District Legal Services Authority (DLSA) that gives free legal
          advice.
        </p>
        <a
          className="button button--secondary"
          href={buildMapsSearchUrl(LEGAL_AID_MAPS_QUERY)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span aria-hidden="true">⌖</span> Find the nearest DLSA on Google Maps
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </div>
      <LegalAidCheck />
      <LimitationReminder />
    </FeaturePanel>
  );
}
