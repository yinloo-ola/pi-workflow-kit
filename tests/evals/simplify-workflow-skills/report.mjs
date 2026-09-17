import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import protocol from "./protocol.json" with { type: "json" };
import { parseUsageJsonl, recomputeUsage } from "./usage.mjs";

const PROTOCOL_HASH = createHash("sha256").update(JSON.stringify(protocol)).digest("hex");
const REQUIRED_ASSESSMENTS = protocol.assessments;
const CONDITIONS = protocol.conditions.flatMap(({ revision, size }) =>
  Array.from({ length: protocol.ordinaryTrialsPerCondition }, (_, i) => `${revision}-${size}-${i + 1}`),
);
const LIFECYCLE = protocol.conditions.map(({ revision, size }) => `${revision}-${size}-lifecycle`);

function error(errors, message) {
  errors.push(message);
}
function inside(path, directory) {
  const rel = relative(directory, isAbsolute(path) ? path : resolve(directory, path));
  return rel && !rel.startsWith("..") && !isAbsolute(rel);
}
function evidenceLocation(path, reportDir) {
  return isAbsolute(path) ? path : resolve(reportDir, path);
}
function evidencePath(errors, reportDir, path, label) {
  if (typeof path !== "string" || !inside(path, reportDir)) {
    error(errors, `${label} must be an existing path inside the report directory`);
    return false;
  }
  const location = evidenceLocation(path, reportDir);
  if (!existsSync(location)) error(errors, `${label} does not exist: ${location}`);
  return true;
}

export function validateReport(report, absoluteReportPath) {
  const errors = [];
  const reportDir = dirname(resolve(absoluteReportPath));
  if (!report || typeof report !== "object") return ["report must be an object"];
  if (report.protocolHash !== PROTOCOL_HASH) error(errors, "protocolHash does not match protocol.json");
  if (report.protocolVersion !== protocol.version) error(errors, "protocolVersion does not match protocol.json");
  if (!report.manifest?.path || !evidencePath(errors, reportDir, report.manifest.path, "manifest")) {
    error(errors, "manifest path is required");
  } else {
    try {
      const manifest = JSON.parse(readFileSync(evidenceLocation(report.manifest.path, reportDir), "utf8"));
      const { hash, ...withoutHash } = manifest;
      if (
        hash !== report.manifestHash ||
        hash !== createHash("sha256").update(JSON.stringify(withoutHash)).digest("hex")
      ) {
        error(errors, "manifestHash does not match the manifest contents");
      }
      if (manifest.protocolHash !== PROTOCOL_HASH) error(errors, "manifest protocolHash does not match protocol.json");
      if (
        manifest.commits?.baseline !== report.commits?.baseline ||
        manifest.commits?.candidate !== report.commits?.candidate
      ) {
        error(errors, "manifest commits do not match report commits");
      }
    } catch (e) {
      error(errors, `manifest cannot be read: ${e.message}`);
    }
  }
  if (!report.commits?.baseline || !report.commits?.candidate) {
    error(errors, "explicit baseline and candidate commits are required");
  } else if (report.commits.baseline === report.commits.candidate) {
    error(errors, "baseline and candidate commits must differ");
  }
  if (report.manifestHash !== report.manifest?.hash) error(errors, "manifestHash must equal manifest.hash");
  for (const revision of ["baseline", "candidate"]) {
    if (typeof report.commits?.[revision] !== "string" || !/^[0-9a-f]{7,64}$/i.test(report.commits[revision])) {
      error(errors, `${revision} commit must be an explicit git hash`);
    }
  }
  const trials = new Map((report.trials ?? []).map((trial) => [trial.trialId, trial]));
  for (const id of CONDITIONS) {
    const trial = trials.get(id);
    if (!trial) {
      error(errors, `missing ordinary trial ${id}`);
      continue;
    }
    if (trial.fresh !== true) error(errors, `${id} must be marked fresh`);
    for (const name of protocol.evidence.requiredFilesPerTrial)
      evidencePath(
        errors,
        reportDir,
        trial.evidence?.[name.replace(".jsonl", "")] ?? trial.evidence?.[name],
        `${id} ${name}`,
      );
    try {
      const usagePath = evidenceLocation(trial.evidence.usage, reportDir);
      const records = parseUsageJsonl(readFileSync(usagePath, "utf8"), usagePath);
      const measured = recomputeUsage(records);
      if (JSON.stringify(measured) !== JSON.stringify(trial.usage))
        error(errors, `${id} usage does not match raw JSONL recomputation`);
    } catch (e) {
      error(errors, `${id}: ${e.message}`);
    }
    if (
      trial.assessments?.length !== REQUIRED_ASSESSMENTS.length ||
      REQUIRED_ASSESSMENTS.some((name) => !trial.assessments?.some((a) => a.name === name && a.verdict && a.evidence))
    ) {
      error(errors, `${id} must assess every required behavior with a verdict and evidence`);
    }
    for (const assessment of trial.assessments ?? [])
      evidencePath(errors, reportDir, assessment.evidence, `${id} assessment evidence`);
  }
  const lifecycle = new Map((report.lifecycle ?? []).map((item) => [item.trialId, item]));
  for (const id of LIFECYCLE) {
    const item = lifecycle.get(id);
    if (!item) {
      error(errors, `missing lifecycle trial ${id}`);
      continue;
    }
    evidencePath(errors, reportDir, item.evidence?.lifecycle, `${id} lifecycle evidence`);
    if (
      item.assessments?.length !== REQUIRED_ASSESSMENTS.length ||
      REQUIRED_ASSESSMENTS.some((name) => !item.assessments?.some((a) => a.name === name && a.verdict && a.evidence))
    ) {
      error(errors, `${id} lifecycle assessments need every required behavior, verdicts, and evidence`);
    }
    for (const assessment of item.assessments ?? [])
      evidencePath(errors, reportDir, assessment.evidence, `${id} lifecycle evidence`);
  }
  const ordinary = (report.trials ?? []).filter((t) => t.usage?.totalTokens != null);
  const grouped = (revision, size) => ordinary.filter((t) => t.revision === revision && t.size === size);
  for (const size of ["large", "control"]) {
    const baseline = grouped("baseline", size).reduce((n, t) => n + t.usage.totalTokens, 0);
    const candidate = grouped("candidate", size).reduce((n, t) => n + t.usage.totalTokens, 0);
    if (!(baseline > 0 && candidate < baseline))
      error(errors, `candidate ${size} ordinary path must show measured token savings`);
  }
  if (report.instrumentationGaps !== 0 && report.instrumentationGaps !== false)
    error(errors, "instrumentationGaps must be zero/false");
  return [...new Set(errors)];
}
