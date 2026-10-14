import { readFileSync } from "node:fs";

/** Provider-exported usage lines: one JSON object per line, one line per request. */
export function parseUsageJsonl(text, source = "<usage>") {
  const records = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`${source}:${index + 1}: invalid JSON (${error.message})`);
    }
    for (const field of ["trialId", "inputTokens", "outputTokens", "totalTokens"]) {
      if (!(field in record)) throw new Error(`${source}:${index + 1}: missing ${field}`);
    }
    for (const field of ["inputTokens", "outputTokens", "totalTokens"]) {
      if (!Number.isSafeInteger(record[field]) || record[field] < 0) {
        throw new Error(`${source}:${index + 1}: ${field} must be a non-negative integer`);
      }
    }
    if (record.totalTokens !== record.inputTokens + record.outputTokens) {
      throw new Error(`${source}:${index + 1}: totalTokens does not equal inputTokens + outputTokens`);
    }
    records.push(record);
  }
  return records;
}

export function recomputeUsage(records) {
  return records.reduce(
    (sum, record) => ({
      inputTokens: sum.inputTokens + record.inputTokens,
      outputTokens: sum.outputTokens + record.outputTokens,
      totalTokens: sum.totalTokens + record.totalTokens,
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  );
}

export function readUsageJsonl(path) {
  return parseUsageJsonl(readFileSync(path, "utf8"), path);
}
