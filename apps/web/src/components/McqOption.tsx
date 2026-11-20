"use client";

import { Icon } from "./Icon";

type McqOptionProps = {
  letter: string;
  text: string;
  selected: boolean;
  onSelect: () => void;
};

export function McqOption({ letter, text, selected, onSelect }: McqOptionProps) {
  if (selected) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className="text-left bg-accent-container border-2 border-primary rounded-md p-gutter-md flex items-center justify-between gap-gutter-md transition-colors duration-state-change ease-state-change"
      >
        <div className="flex items-center gap-gutter-md">
          <span className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono text-mono-md shrink-0">
            {letter}
          </span>
          <span className="font-body text-body-lg text-on-accent-container">{text}</span>
        </div>
        <Icon name="check_circle" className="text-success" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left bg-surface-container-low border border-outline-variant rounded-md p-gutter-md flex items-center gap-gutter-md transition-colors duration-state-change ease-state-change hover:border-primary"
    >
      <span className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center font-mono text-mono-md text-on-surface shrink-0">
        {letter}
      </span>
      <span className="font-body text-body-lg text-on-surface">{text}</span>
    </button>
  );
}
