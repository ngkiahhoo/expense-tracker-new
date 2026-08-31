"use client";

import { useState } from "react";

import ActionIconButton from "@/components/ui/ActionIconButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { overlayStyles } from "@/components/ui/styles";

interface ExportModalProps {
  onClose:() => void;
  onCopyError:(message:string) => void;
  payload:string;
}

export default function ExportModal({
  onClose,
  onCopyError,
  payload,
}:ExportModalProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className={overlayStyles.backdrop}
      onClick={onClose}
    >
      <Card
        variant="default"
        padding="lg"
        className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">
            Export Data
          </h2>

          <ActionIconButton
            kind="close"
            onClick={onClose}
            title="Close export modal"
            aria-label="Close export modal"
          />
        </div>

        <Textarea
          value={payload}
          readOnly
          fieldSize="md"
          className="min-h-[320px] flex-1 bg-zinc-800 font-mono text-zinc-300"
        />

        <div className="flex gap-3">
          <Button
            onClick={() => {
              navigator.clipboard.writeText(payload)
                .then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                })
                .catch(() => {
                  onCopyError("Failed to copy. Please select text and copy manually.");
                });
            }}
            variant={copied ? "secondary" : "primary"}
            size="lg"
            className="flex-1"
          >
            {copied ? "Copied!" : "Copy Text"}
          </Button>

          <ActionIconButton
            kind="close"
            onClick={onClose}
            title="Close export modal"
            aria-label="Close export modal"
          />
        </div>
      </Card>
    </div>
  );
}
