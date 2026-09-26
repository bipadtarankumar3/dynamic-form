import { useState } from "react";

export default function RemarkBlock({ text }) {
  const [expanded, setExpanded] = useState(false);

  const MAX_CHARS = 160;
  const isLong = text.length > MAX_CHARS;

  const visibleText = expanded
    ? text
    : text.slice(0, MAX_CHARS);

  return (
    <div className="mt-1 text-sm text-gray-600">
      <span className="italic">Remarks:</span>{" "}
      <span className="whitespace-pre-wrap">{visibleText}</span>

      {isLong && (
        <span
          onClick={() => setExpanded(!expanded)}
          className="ml-1 text-blue-600 cursor-pointer text-xs"
        >
          {expanded ? " Show less" : "... Show more"}
        </span>
      )}
    </div>
  );
}
