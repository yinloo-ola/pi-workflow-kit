import { isSourceFile } from "./heuristics";

const EXCESSIVE_FIX_THRESHOLD = 3;

export type DebugViolationType = "fix-without-investigation" | "excessive-fix-attempts";

export interface DebugViolation {
  type: DebugViolationType;
  file: string;
  fixAttempts: number;
}

export class DebugMonitor {
  private active = false;
  private investigated = false;
  private fixAttempts_ = 0;
  private sourceWrittenSinceLastTest = false;

  getState(): { active: boolean; investigated: boolean; fixAttempts: number } {
    return {
      active: this.active,
      investigated: this.investigated,
      fixAttempts: this.fixAttempts_,
    };
  }

  setState(state: { active: boolean; investigated: boolean; fixAttempts: number }): void {
    this.active = state.active;
    this.investigated = state.investigated;
    this.fixAttempts_ = state.fixAttempts;
    this.sourceWrittenSinceLastTest = false;
  }

  isActive(): boolean {
    return this.active;
  }

  hasInvestigated(): boolean {
    return this.investigated;
  }

  getFixAttempts(): number {
    return this.fixAttempts_;
  }

  onTestFailed(): void {
    if (this.active && this.sourceWrittenSinceLastTest) {
      this.fixAttempts_++;
    }
    this.active = true;
    this.investigated = false;
    this.sourceWrittenSinceLastTest = false;
  }

  onTestPassed(): void {
    this.reset();
  }

  onInvestigation(): void {
    this.investigated = true;
  }

  onSourceWritten(path: string): DebugViolation | null {
    if (!this.active) return null;
    if (!isSourceFile(path)) return null;

    this.sourceWrittenSinceLastTest = true;

    if (this.fixAttempts_ >= EXCESSIVE_FIX_THRESHOLD) {
      return {
        type: "excessive-fix-attempts",
        file: path,
        fixAttempts: this.fixAttempts_,
      };
    }

    if (!this.investigated) {
      return {
        type: "fix-without-investigation",
        file: path,
        fixAttempts: this.fixAttempts_,
      };
    }

    return null;
  }

  onCommit(): void {
    this.reset();
  }

  private reset(): void {
    this.active = false;
    this.investigated = false;
    this.fixAttempts_ = 0;
    this.sourceWrittenSinceLastTest = false;
  }
}
