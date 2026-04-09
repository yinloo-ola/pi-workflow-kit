import fs from "node:fs";
import { findCorrespondingTestFile, isSourceFile, isTestFile } from "./heuristics";

export type TddPhase = "idle" | "red-pending" | "red" | "green" | "refactor";

export type TddViolationType = "source-before-test" | "source-during-red" | "existing-tests-not-run-before-change";

export interface TddViolation {
  type: TddViolationType;
  file: string;
}

export class TddMonitor {
  private phase: TddPhase = "idle";
  private testFilesWritten = new Set<string>();
  private sourceFilesWritten = new Set<string>();
  private redVerificationPending = false;
  private nonCodeMode = false;
  private testsRunBeforeLastWrite = false;
  private fileExists: (path: string) => boolean;

  constructor(fileExists?: (path: string) => boolean) {
    this.fileExists = fileExists ?? ((filePath) => fs.existsSync(filePath));
  }

  getPhase(): TddPhase {
    return this.phase;
  }

  isRedVerificationPending(): boolean {
    return this.phase === "red-pending" && this.redVerificationPending;
  }

  setNonCodeMode(value: boolean): void {
    this.nonCodeMode = value;
  }

  onFileWritten(path: string): TddViolation | null {
    if (this.nonCodeMode) return null;

    if (isTestFile(path)) {
      this.testFilesWritten.add(path);
      this.phase = "red-pending";
      this.redVerificationPending = true;
      return null;
    }

    if (isSourceFile(path)) {
      this.sourceFilesWritten.add(path);

      const wasTestsRun = this.testsRunBeforeLastWrite;
      this.testsRunBeforeLastWrite = false;

      if (this.testFilesWritten.size === 0) {
        const existingTestFile = findCorrespondingTestFile(path).some((candidatePath) =>
          this.fileExists(candidatePath),
        );
        if (!existingTestFile) {
          return { type: "source-before-test", file: path };
        }
        // Existing test coverage detected — Scenario 2 check
        if (!wasTestsRun) {
          return { type: "existing-tests-not-run-before-change", file: path };
        }
        return null;
      }

      if (this.phase === "red-pending") {
        return { type: "source-during-red", file: path };
      }

      if (this.phase === "green") {
        this.phase = "refactor";
      }
      return null;
    }

    return null;
  }

  onTestResult(passed: boolean): void {
    this.testsRunBeforeLastWrite = true;

    if (this.phase === "red-pending") {
      this.redVerificationPending = false;
      if (passed) {
        this.phase = "green";
      } else {
        this.phase = "red";
      }
      return;
    }

    if (passed && (this.phase === "red" || this.phase === "refactor")) {
      this.phase = "green";
    }
  }

  onCommit(): void {
    this.phase = "idle";
    this.redVerificationPending = false;
    this.testFilesWritten.clear();
    this.sourceFilesWritten.clear();
    this.testsRunBeforeLastWrite = false;
  }

  setState(
    phase: TddPhase,
    testFiles: string[],
    sourceFiles: string[],
    redVerificationPending = false,
    nonCodeMode = false,
  ): void {
    this.phase = phase;
    this.testFilesWritten = new Set(testFiles);
    this.sourceFilesWritten = new Set(sourceFiles);
    this.redVerificationPending = redVerificationPending;
    this.nonCodeMode = nonCodeMode;
    this.testsRunBeforeLastWrite = false;
  }

  getState(): {
    phase: TddPhase;
    testFiles: string[];
    sourceFiles: string[];
    redVerificationPending: boolean;
    nonCodeMode: boolean;
  } {
    return {
      phase: this.phase,
      testFiles: [...this.testFilesWritten],
      sourceFiles: [...this.sourceFilesWritten],
      redVerificationPending: this.redVerificationPending,
      nonCodeMode: this.nonCodeMode,
    };
  }
}
