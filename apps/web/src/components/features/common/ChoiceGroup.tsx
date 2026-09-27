/**
 * A radio group rendered as large, tappable option cards.
 *
 * Responsibility: one accessible single-choice control (native radios in a fieldset with
 * a legend, so arrow keys and screen readers work without custom ARIA). Boundary:
 * controlled — the parent owns the value.
 */
import type { ReactElement } from 'react';

export interface ChoiceOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly hint: string;
}

interface ChoiceGroupProps<T extends string> {
  readonly legend: string;
  /** The radios' shared `name`; unique on the page. */
  readonly name: string;
  readonly options: readonly ChoiceOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

export function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: ChoiceGroupProps<T>): ReactElement {
  return (
    <fieldset className="choice-group">
      <legend className="choice-group__legend">{legend}</legend>
      <div className="choice-group__options">
        {options.map((option) => (
          <label key={option.value} className="choice">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span className="choice__label">{option.label}</span>
            <span className="choice__hint">{option.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
