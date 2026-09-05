import { readFileSync } from "node:fs";
import workflowGuard, { ROLE_NAMES } from "../extensions/workflow-guard";

export { ROLE_NAMES };

export type PiHandler = (event: any, ctx: any) => unknown;

/** Read an agent role file, split into frontmatter and body. */
export function readRole(name: string): { frontmatter: string; body: string } {
  const content = readFileSync(`agents/${name}.md`, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Role ${name} has invalid frontmatter`);
  return { frontmatter: match[1], body: match[2] };
}

/** Minimal ExtensionAPI harness: one handler per event + registered commands. */
export function createExtensionHarness() {
  const handlers = new Map<string, PiHandler>();
  const commands = new Map<string, { handler: (args: string, ctx: any) => unknown }>();
  const pi = {
    on(event: string, handler: PiHandler) {
      handlers.set(event, handler);
    },
    registerCommand(name: string, options: { handler: (args: string, ctx: any) => unknown }) {
      commands.set(name, options);
    },
    sendMessage() {},
  };
  workflowGuard(pi as any);
  return { commands, handlers };
}

/** Command context stub capturing notifications against a given cwd. */
export function createCommandContext(cwd: string, notifications: string[] = []) {
  return {
    cwd,
    ui: {
      notify(message: string) {
        notifications.push(message);
      },
    },
  };
}
