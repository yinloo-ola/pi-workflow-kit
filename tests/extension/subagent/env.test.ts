import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { buildSubagentEnv } from "../../../extensions/subagent/env.js";

describe("buildSubagentEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("includes PATH and HOME", () => {
    process.env.PATH = "/usr/bin";
    process.env.HOME = "/home/user";
    const env = buildSubagentEnv();
    expect(env.PATH).toBe("/usr/bin");
    expect(env.HOME).toBe("/home/user");
  });

  test("includes all explicit allowlist vars", () => {
    process.env.SHELL = "/bin/zsh";
    process.env.TERM = "xterm-256color";
    process.env.USER = "testuser";
    process.env.LOGNAME = "testuser";
    process.env.TMPDIR = "/tmp";
    process.env.EDITOR = "vim";
    process.env.VISUAL = "code";
    process.env.SSH_AUTH_SOCK = "/tmp/ssh.sock";
    process.env.COLORTERM = "truecolor";
    process.env.FORCE_COLOR = "1";
    process.env.NO_COLOR = "1";
    const env = buildSubagentEnv();
    expect(env.SHELL).toBe("/bin/zsh");
    expect(env.TERM).toBe("xterm-256color");
    expect(env.USER).toBe("testuser");
    expect(env.LOGNAME).toBe("testuser");
    expect(env.TMPDIR).toBe("/tmp");
    expect(env.EDITOR).toBe("vim");
    expect(env.VISUAL).toBe("code");
    expect(env.SSH_AUTH_SOCK).toBe("/tmp/ssh.sock");
    expect(env.COLORTERM).toBe("truecolor");
    expect(env.FORCE_COLOR).toBe("1");
    expect(env.NO_COLOR).toBe("1");
  });

  test("includes PI_ prefixed vars", () => {
    process.env.PI_CUSTOM_CONFIG = "value";
    const env = buildSubagentEnv();
    expect(env.PI_CUSTOM_CONFIG).toBe("value");
  });

  test("includes NODE_ prefixed vars", () => {
    process.env.NODE_ENV = "test";
    process.env.NODE_PATH = "/usr/lib/node";
    const env = buildSubagentEnv();
    expect(env.NODE_ENV).toBe("test");
    expect(env.NODE_PATH).toBe("/usr/lib/node");
  });

  test("includes NPM_, NVM_, LANG, LC_, XDG_ prefixed vars", () => {
    process.env.NPM_CONFIG_REGISTRY = "https://registry.npmjs.org";
    process.env.NVM_DIR = "/home/user/.nvm";
    process.env.LANG = "en_US.UTF-8";
    process.env.LANGUAGE = "en_US";
    process.env.LC_ALL = "en_US.UTF-8";
    process.env.XDG_CONFIG_HOME = "/home/user/.config";
    const env = buildSubagentEnv();
    expect(env.NPM_CONFIG_REGISTRY).toBe("https://registry.npmjs.org");
    expect(env.NVM_DIR).toBe("/home/user/.nvm");
    expect(env.LANG).toBe("en_US.UTF-8");
    expect(env.LANGUAGE).toBe("en_US");
    expect(env.LC_ALL).toBe("en_US.UTF-8");
    expect(env.XDG_CONFIG_HOME).toBe("/home/user/.config");
  });

  test("excludes common secret vars including LANG-prefixed API keys", () => {
    process.env.AWS_SECRET_ACCESS_KEY = "secret123";
    process.env.AWS_ACCESS_KEY_ID = "key123";
    process.env.DATABASE_URL = "postgres://secret";
    process.env.GITHUB_TOKEN = "ghp_xxx";
    process.env.OPENAI_API_KEY = "sk-xxx";
    process.env.ANTHROPIC_API_KEY = "sk-ant-xxx";
    process.env.STRIPE_SECRET_KEY = "sk_live_xxx";
    process.env.LANGCHAIN_API_KEY = "lc-xxx";
    process.env.LANGSMITH_API_KEY = "ls-xxx";
    const env = buildSubagentEnv();
    expect(env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(env.AWS_ACCESS_KEY_ID).toBeUndefined();
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.GITHUB_TOKEN).toBeUndefined();
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
    expect(env.LANGCHAIN_API_KEY).toBeUndefined();
    expect(env.LANGSMITH_API_KEY).toBeUndefined();
  });

  test("passthrough via PI_SUBAGENT_ENV_PASSTHROUGH", () => {
    process.env.PI_SUBAGENT_ENV_PASSTHROUGH = "MY_CUSTOM_VAR,ANOTHER_VAR";
    process.env.MY_CUSTOM_VAR = "hello";
    process.env.ANOTHER_VAR = "world";
    const env = buildSubagentEnv();
    expect(env.MY_CUSTOM_VAR).toBe("hello");
    expect(env.ANOTHER_VAR).toBe("world");
  });

  test("passthrough with empty or missing value is a no-op", () => {
    process.env.PI_SUBAGENT_ENV_PASSTHROUGH = "";
    const env = buildSubagentEnv();
    expect(env.PATH).toBeDefined();
  });

  test("passthrough var that does not exist in env is silently skipped", () => {
    process.env.PI_SUBAGENT_ENV_PASSTHROUGH = "NONEXISTENT_VAR";
    const env = buildSubagentEnv();
    expect(env.NONEXISTENT_VAR).toBeUndefined();
  });

  test("merges extra vars passed as argument", () => {
    const env = buildSubagentEnv({ MY_EXTRA_VAR: "/tmp/v.txt" });
    expect(env.MY_EXTRA_VAR).toBe("/tmp/v.txt");
  });

  test("extra vars override filtered env", () => {
    process.env.MY_EXTRA_VAR = "/old/path";
    const env = buildSubagentEnv({ MY_EXTRA_VAR: "/new/path" });
    expect(env.MY_EXTRA_VAR).toBe("/new/path");
  });
});
