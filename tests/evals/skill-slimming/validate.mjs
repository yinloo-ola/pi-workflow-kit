#!/usr/bin/env node
/**
 * Validator for the skill-slimming fidelity/cost probe (skill-slimming-2 R5).
 *
 * Reads a recorded probe report and refuses it unless every fact in it can be
 * recomputed from the raw provider output. It never invokes a provider, a model,
 * or the network, and it never edits the report.
 *
 * Usage: node validate.mjs <report.json>
 * Exit 0 = accepted (both commits distinct, six trials complete, every assessment
 * carried with evidence, token totals recomputed, no candidate regression, and the
 * candidate median below the baseline median). Exit 1 = rejected, naming each fault.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import protocol from "./protocol.json" with { type: "json" };
import { parseUsageJsonl, recomputeUsage } from "./usage.mjs";

const REQUIRED_ASSESSMENTS = protocol.assessments;
const VERDICTS = protocol.verdicts;
const tokensOf = (usage) => [usage?.inputTokens, usage?.outputTokens, usage?.totalTokens];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

const spread = (values) => Math.max(...values) - Math.min(...values);

const trialIds = (condition) =>
  Array.from({ length: protocol.trialsPerCondition }, (_, index) => `${condition}-${index + 1}`);

export function validateReport(report, absoluteReportPath) {
  const errors = [];
  const reportDir = dirname(resolve(absoluteReportPath));
  const located = (path) => (isAbsolute(path) ? path : resolve(reportDir, path));
  const evidenceExists = (path, label) => {
    if (typeof path !== "string" || !path.trim()) {
      errors.push(`${label} is missing`);
      return;
    }
    if (!existsSync(located(path))) errors.push(`${label} does not exist: ${located(path)}`);
  };

  if (!report || typeof report !== "object") return { errors: ["report must be an object"], stats: null };

  for (const condition of protocol.conditions) {
    const commit = report.commits?.[condition];
    if (typeof commit !== "string" || !/^[0-9a-f]{7,64}$/i.test(commit)) {
      errors.push(`${condition} commit must be an explicit git hash`);
    }
  }
  if (report.commits?.baseline && report.commits.baseline === report.commits.candidate) {
    errors.push("baseline and candidate commits must differ");
  }

  const trials = new Map((report.trials ?? []).map((trial) => [trial.trialId, trial]));
  const totals = Object.fromEntries(protocol.conditions.map((condition) => [condition, []]));

  for (const condition of protocol.conditions) {
    for (const id of trialIds(condition)) {
      const trial = trials.get(id);
      if (!trial) {
        errors.push(`missing trial ${id}`);
        continue;
      }
      evidenceExists(trial.evidence?.transcript, `${id} transcript`);
      evidenceExists(trial.evidence?.usage, `${id} usage file`);

      for (const name of REQUIRED_ASSESSMENTS) {
        const assessment = trial.assessments?.find((entry) => entry.name === name);
        if (!assessment) {
          errors.push(`${id}: missing assessment verdict for ${name}`);
          continue;
        }
        if (!VERDICTS.includes(assessment.verdict)) {
          errors.push(`${id}: assessment ${name} has verdict "${assessment.verdict}" (expected ${VERDICTS.join("|")})`);
        }
        if (!assessment.evidence) errors.push(`${id}: assessment ${name} has no evidence pointer`);
        else evidenceExists(assessment.evidence, `${id} ${name} evidence`);
      }

      if (typeof trial.evidence?.usage === "string" && existsSync(located(trial.evidence.usage))) {
        try {
          const measured = recomputeUsage(
            parseUsageJsonl(readFileSync(located(trial.evidence.usage), "utf8"), trial.evidence.usage),
          );
          const recorded = trial.usage ?? {};
          if (tokensOf(recorded).join(",") !== tokensOf(measured).join(",")) {
            errors.push(
              `${id}: recorded totalTokens ${recorded.totalTokens} (input ${recorded.inputTokens}, output ${recorded.outputTokens}) does not match recomputed ${measured.totalTokens} (input ${measured.inputTokens}, output ${measured.outputTokens})`,
            );
          }
          if (Number.isSafeInteger(measured.totalTokens)) totals[condition].push(measured.totalTokens);
        } catch (error) {
          errors.push(`${id}: ${error.message}`);
        }
      }
    }
  }

  for (let index = 0; index < protocol.trialsPerCondition; index += 1) {
    const candidate = trials.get(`candidate-${index + 1}`);
    const baseline = trials.get(`baseline-${index + 1}`);
    if (!candidate || !baseline) continue;
    for (const name of REQUIRED_ASSESSMENTS) {
      const before = baseline.assessments?.find((entry) => entry.name === name)?.verdict;
      const after = candidate.assessments?.find((entry) => entry.name === name)?.verdict;
      if (before === "pass" && after === "fail") {
        errors.push(`candidate-${index + 1} regresses ${name} against baseline-${index + 1}`);
      }
    }
  }

  const complete = protocol.conditions.every((condition) => totals[condition].length === protocol.trialsPerCondition);
  let stats = null;
  if (complete) {
    stats = Object.fromEntries(
      protocol.conditions.map((condition) => [
        condition,
        { totals: totals[condition], median: median(totals[condition]), spread: spread(totals[condition]) },
      ]),
    );
    if (stats.candidate.median >= stats.baseline.median) {
      errors.push(`candidate median ${stats.candidate.median} is not below baseline median ${stats.baseline.median}`);
    }
  } else {
    errors.push("cannot compare: the two conditions do not each have complete recomputed totals");
  }

  return { errors, stats };
}

const isCli = process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href;
if (isCli) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node validate.mjs <report.json>");
    process.exit(1);
  }
  let result;
  try {
    result = validateReport(JSON.parse(readFileSync(target, "utf8")), target);
  } catch (error) {
    console.error(`report cannot be read: ${error.message}`);
    process.exit(1);
  }
  if (result.stats) {
    const { baseline, candidate } = result.stats;
    console.log("condition  trials              median total tokens  spread");
    console.log(
      `baseline   ${baseline.totals.join(", ")}${" ".repeat(Math.max(1, 20 - baseline.totals.join(", ").length))}${baseline.median}${" ".repeat(19)}${baseline.spread}`,
    );
    console.log(
      `candidate  ${candidate.totals.join(", ")}${" ".repeat(Math.max(1, 20 - candidate.totals.join(", ").length))}${candidate.median}${" ".repeat(19)}${candidate.spread}`,
    );
  }
  if (result.errors.length) {
    for (const error of result.errors) console.error(`✖ ${error}`);
    process.exit(1);
  }
  console.log("✓ probe report accepted");
}
