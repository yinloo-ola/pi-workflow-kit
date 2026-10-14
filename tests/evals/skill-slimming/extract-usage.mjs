#!/usr/bin/env node
/**
 * Turn a pi session JSONL into the probe's usage lines.
 *
 * The provider reports, per turn: input, output, cacheRead, cacheWrite, totalTokens,
 * where totalTokens = input + output + cacheRead + cacheWrite. The probe's line schema
 * is trialId/inputTokens/outputTokens/totalTokens with totalTokens = input + output, so
 * prompt-side cache tokens fold into inputTokens and each line's total is unchanged from
 * the session's own accounting.
 *
 * Usage: node extract-usage.mjs <session.jsonl> <trialId> [outPath]
 * Without an outPath the lines go to stdout, so a caller can redirect them.
 */
import { readFileSync, writeFileSync } from "node:fs";

/** Every usage block in a session, in encounter order. */
function usageBlocks(jsonlText) {
  const blocks = [];
  for (const line of jsonlText.split("\n")) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        for (const item of node) walk(item);
        return;
      }
      if (node.usage && typeof node.usage === "object" && typeof node.usage.totalTokens === "number") {
        blocks.push(node.usage);
      }
      for (const value of Object.values(node)) walk(value);
    };
    walk(event);
  }
  return blocks;
}

/** The probe's usage lines for one trial. */
export function usageLinesFromSession(jsonlText, trialId) {
  return usageBlocks(jsonlText).map((usage, index) => {
    const inputTokens = (usage.input ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0);
    const outputTokens = usage.output ?? 0;
    return { trialId, turn: index + 1, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
  });
}

const isCli = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isCli) {
  const [session, trialId, outPath] = process.argv.slice(2);
  if (!session || !trialId) {
    console.error("usage: node extract-usage.mjs <session.jsonl> <trialId> [outPath]");
    process.exit(1);
  }
  const body = usageLinesFromSession(readFileSync(session, "utf8"), trialId)
    .map((line) => JSON.stringify(line))
    .join("\n");
  if (outPath) writeFileSync(outPath, `${body}\n`);
  else console.log(body);
}
