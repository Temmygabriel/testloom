/**
 * evidence.ts — Action log collector
 *
 * Provides a lightweight collector that records each browser action step
 * taken during a check run. The log is attached to the CheckResult and
 * shown in the Evidence screen.
 */

import type { ActionType, EvidenceEntry } from "@/types";

export class EvidenceCollector {
  private entries: EvidenceEntry[] = [];

  record(actionType: ActionType, outcome: string, selector?: string): void {
    this.entries.push({
      timestamp: new Date().toISOString(),
      actionType,
      outcome,
      ...(selector !== undefined ? { selector } : {}),
    });
  }

  getEntries(): EvidenceEntry[] {
    return [...this.entries];
  }
}
