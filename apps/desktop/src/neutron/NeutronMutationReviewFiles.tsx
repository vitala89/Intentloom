import { useRef } from "react";
import type { KeyboardEvent } from "react";
import type { NeutronMutationReviewFileView } from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import { mutationReviewMoveIndex } from "./neutron-mutation-review-keyboard.js";

export interface NeutronMutationReviewFilesProps {
  readonly files: readonly NeutronMutationReviewFileView[];
  readonly selectedPath: string | null;
  readonly onSelect: (path: string) => void;
}

export function NeutronMutationReviewFiles({
  files,
  selectedPath,
  onSelect,
}: NeutronMutationReviewFilesProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const index = files.findIndex((file) => file.path === selectedPath);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = files.findIndex(
      (file) => file.path === event.currentTarget.dataset.path,
    );
    const next = mutationReviewMoveIndex(current, files.length, event.key);
    if (next === null) return;
    event.preventDefault();
    const file = files[next];
    if (file === undefined) return;
    onSelect(file.path);
    refs.current[file.path]?.focus();
  };
  return (
    <div>
      <div role="listbox" aria-label="Changed files">
        {files.map((file) => {
          const selected = file.path === selectedPath;
          return (
            <button
              key={file.path}
              ref={(node) => {
                refs.current[file.path] = node;
              }}
              type="button"
              role="option"
              data-path={file.path}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(file.path)}
              onKeyDown={onKeyDown}
            >
              <span>{file.path}</span>
              <span>{file.operation}</span>
              <span>{file.status}</span>
            </button>
          );
        })}
      </div>
      <div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Previous file"
          disabled={index <= 0}
          onClick={() => {
            const file = files[index - 1];
            if (file) onSelect(file.path);
          }}
        >
          Previous file
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Next file"
          disabled={index < 0 || index >= files.length - 1}
          onClick={() => {
            const file = files[index + 1];
            if (file) onSelect(file.path);
          }}
        >
          Next file
        </Button>
      </div>
    </div>
  );
}
