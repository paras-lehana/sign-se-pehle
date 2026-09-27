/**
 * The four ways to give us a document: Paste · Upload · Camera · Samples.
 *
 * Responsibility: compose the input tabs from the paste field, the upload field, the
 * camera button and the sample chips. Boundary: every panel stays mounted (mountAll) so a
 * chosen file survives switching tabs; the form owns all state. Samples only fill the
 * form — they never submit.
 */
import type { ReactElement, Ref } from 'react';
import { CameraButton } from '../features/camera/CameraButton';
import { SampleDocuments } from '../features/samples/SampleDocuments';
import type { SampleDocument } from '../../lib/samples';
import { Icon, type IconName } from '../ui/Icon';
import { Tabs } from '../ui/Tabs';
import { FileField } from './FileField';
import { PasteField } from './PasteField';

export type InputTabId = 'paste' | 'upload' | 'camera' | 'samples';

const TAB_LABELS: readonly { readonly id: InputTabId; readonly label: string; readonly icon: IconName }[] = [
  { id: 'paste', label: 'Paste', icon: 'paste' },
  { id: 'upload', label: 'Upload', icon: 'upload' },
  { id: 'camera', label: 'Camera', icon: 'camera' },
  { id: 'samples', label: 'Samples', icon: 'sparkle' },
];

interface InputTabsProps {
  readonly selected: InputTabId;
  readonly onSelect: (id: InputTabId) => void;
  readonly text: string;
  readonly textInvalid: boolean;
  readonly onTextChange: (text: string) => void;
  readonly textareaRef: Ref<HTMLTextAreaElement>;
  /** Changing it remounts the file input, which clears the browser's chosen file. */
  readonly fileKey: number;
  readonly fileErrorId: string;
  readonly fileInvalid: boolean;
  readonly onUpload: (file: File | null, error: string | null) => void;
  readonly onPhoto: (file: File) => void;
  readonly onPickSample: (sample: SampleDocument) => void;
}

export function InputTabs(props: InputTabsProps): ReactElement {
  const panels: Readonly<Record<InputTabId, ReactElement>> = {
    paste: (
      <PasteField
        value={props.text}
        invalid={props.textInvalid}
        onChange={props.onTextChange}
        textareaRef={props.textareaRef}
      />
    ),
    upload: (
      <FileField
        key={props.fileKey}
        id="document-file"
        errorId={props.fileErrorId}
        invalid={props.fileInvalid}
        onChange={props.onUpload}
      />
    ),
    camera: (
      <div className="input-panel">
        <p className="field__hint">
          Photograph each printed page in good light, flat and straight. Gemini reads the photo; it
          is never stored.
        </p>
        <CameraButton onFile={props.onPhoto} />
      </div>
    ),
    samples: (
      <div className="input-panel">
        <p className="field__hint">
          Try a realistic sample with made-up names. It only fills the form — nothing is sent until
          you choose “Explain this document”.
        </p>
        <SampleDocuments onPick={props.onPickSample} />
      </div>
    ),
  };

  return (
    <Tabs
      idPrefix="input"
      label="How to add your document"
      className="tabs--segmented"
      mountAll
      selectedId={props.selected}
      onSelect={(id) => {
        const next = TAB_LABELS.find((tab) => tab.id === id);
        if (next !== undefined) props.onSelect(next.id);
      }}
      items={TAB_LABELS.map((tab) => ({
        id: tab.id,
        label: (
          <>
            <Icon name={tab.icon} className="tabs__icon" />
            {tab.label}
          </>
        ),
        panel: panels[tab.id],
      }))}
    />
  );
}
