import { useState } from "react";
import { Mesh } from "three";
// @ts-expect-error no types in this library yet
import { getCaretAtPoint } from "troika-three-text";

export default function useTrimmedText(fullText: string) {
  const [{ lastCheckedText, endPosition }, setBodyCheck] = useState<{
    lastCheckedText: string | null;
    endPosition: number;
  }>({ lastCheckedText: null, endPosition: Infinity });

  const onSyncTroikaText = (
    troikaText: Mesh & {
      textRenderInfo: { lineHeight: number };
      clipRect: [number, number, number, number];
    },
  ) => {
    if (fullText !== lastCheckedText) {
      const [checkX, checkY] = troikaText.clipRect;
      try {
        // get the charIndex in the last fully-rendered row to know where to show a "..."
        const caret: { charIndex: number; y: number } = getCaretAtPoint(
          troikaText.textRenderInfo,
          checkX,
          checkY,
        );
        if (caret.y - troikaText.textRenderInfo.lineHeight < checkY) {
          setBodyCheck({
            lastCheckedText: fullText,
            endPosition: caret.charIndex,
          });
        } else {
          setBodyCheck({
            lastCheckedText: fullText,
            endPosition: Infinity,
          });
        }
      } catch (e) {
        // getCaretAtPoint throws an error if it doesn't find anything
        setBodyCheck({
          lastCheckedText: fullText,
          endPosition: Infinity,
        });
      }
    }
  };

  const isTextTooLong =
    fullText === lastCheckedText && fullText.length > endPosition;

  let trimmedText: string;
  if (isTextTooLong) {
    trimmedText = fullText.substring(0, endPosition).trimEnd();
  } else {
    trimmedText = fullText;
  }

  return { trimmedText, onSyncTroikaText };
}
