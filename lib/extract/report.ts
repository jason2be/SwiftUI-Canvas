import type { Doc } from "../tokens";

/* Extraction reports: every decision the rule-based extractor makes is
 * recorded with a confidence, so an agent (or a person) can see exactly what
 * was guessed and revise the draft document deliberately. */

export type Decision = {
  /** CSS-ish selector or text snippet that produced this decision */
  source: string;
  /** what was decided, human-readable */
  decision: string;
  /** how sure the rule is: high = structural (a <table> is a list), low = a guess */
  confidence: "high" | "medium" | "low";
  /** why: the rule that fired */
  reason: string;
};

export interface Extraction {
  doc: Doc;
  decisions: Decision[];
  /** inputs the rules could not handle (JS-rendered content, unknown icons…) */
  notes: string[];
}

export const describe = (d: Decision): string => `${d.confidence === "high" ? "●" : d.confidence === "medium" ? "◐" : "○"} ${d.decision} — ${d.source} (${d.reason})`;
