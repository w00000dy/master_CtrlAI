import React from "react";
import { Paragraph } from "../actions/parsePdf";

export const ParagraphRenderer = ({ paragraph, depth = 0 }: { paragraph: Paragraph; depth?: number }) => {
  return (
    <div className={depth > 0 ? "ml-6 mt-2" : "space-y-2"}>
      <div className="flex items-start">
        {depth > 0 && <span className="mr-3 text-zinc-400 mt-1.5 leading-none">•</span>}
        <p className={`text-zinc-700 dark:text-zinc-300 leading-relaxed ${depth === 0 ? "" : ""}`}>
          {paragraph.marker && <strong className="mr-2">{paragraph.marker}</strong>}
          {paragraph.text}
        </p>
      </div>
      {paragraph.subParagraphs && paragraph.subParagraphs.length > 0 && (
        <div className="space-y-2 mt-2">
          {paragraph.subParagraphs.map((subP, idx) => (
            <ParagraphRenderer key={idx} paragraph={subP} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
