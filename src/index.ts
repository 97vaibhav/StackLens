#!/usr/bin/env node
// eslint-disable-next-line @typescript-eslint/no-deprecated -- McpServer high-level API doesn't support custom request handlers; low-level Server is correct here
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { explainError } from "./tools/explainError.js";
import { formatResult } from "./utils/formatter.js";
import { validateErrorInput, validateLanguageHint } from "./hooks/validateInput.js";
import { logResult } from "./hooks/logResult.js";

const server = new Server(
  { name: "stacklens", version: "1.0.0" },
  { capabilities: { tools: {}, prompts: {} } }
);

// ── List tools ──────────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "explain_error",
      description:
        "Analyzes a stack trace or error message and returns a structured explanation with root cause, fix, and severity.",
      inputSchema: {
        type: "object",
        properties: {
          error_text: {
            type: "string",
            description: "The full stack trace or error message to analyze",
          },
          language_hint: {
            type: "string",
            description:
              "Optional language hint (e.g. Python, JavaScript). Auto-detected if not provided.",
          },
        },
        required: ["error_text"],
      },
    },
    {
      name: "explain_errors_batch",
      description: "Analyze multiple errors at once. Returns an array of results.",
      inputSchema: {
        type: "object",
        properties: {
          errors: {
            type: "array",
            items: { type: "string" },
            description: "Array of error strings to analyze",
            maxItems: 10,
          },
        },
        required: ["errors"],
      },
    },
  ],
}));

// ── Call tool ───────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "explain_error") {
    const { error_text, language_hint } = args as {
      error_text: string;
      language_hint?: string;
    };

    const validation = validateErrorInput(error_text);
    if (!validation.valid) {
      console.error(`[StackLens] Validation rejected: ${validation.reason}`);
      return {
        content: [{ type: "text", text: `StackLens: ${validation.reason}` }],
        isError: true,
      };
    }

    const langValidation = validateLanguageHint(language_hint);
    if (!langValidation.valid) {
      console.error(`[StackLens] Language hint rejected: ${langValidation.reason}`);
      return {
        content: [{ type: "text", text: `StackLens: ${langValidation.reason}` }],
        isError: true,
      };
    }

    try {
      const result = await explainError(error_text, server, language_hint);
      const formatted = formatResult(result);
      logResult(error_text, result);

      return {
        content: [
          { type: "text", text: formatted },
          {
            type: "text",
            text: `\n\n**Raw JSON:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (err) {
      console.error("[StackLens] Analysis failed:", err instanceof Error ? err.message : String(err));
      return {
        content: [
          {
            type: "text",
            text: "StackLens could not analyze this error. Please check that your stack trace is complete and try again.",
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "explain_errors_batch") {
    const { errors } = args as { errors: string[] };

    const invalidItems = errors
      .map((e, i) => ({ i, result: validateErrorInput(e) }))
      .filter((x) => !x.result.valid)
      .map((x) => `Error ${x.i + 1}: ${x.result.reason}`);

    if (invalidItems.length > 0) {
      return {
        content: [{ type: "text", text: `StackLens validation failed:\n${invalidItems.join("\n")}` }],
        isError: true,
      };
    }

    const results = await Promise.allSettled(errors.map((e) => explainError(e, server)));

    const content = results.map((r, i) => {
      if (r.status === "fulfilled") {
        logResult(errors[i], r.value);
        return { type: "text" as const, text: `### Error ${i + 1}\n\n${formatResult(r.value)}` };
      }
      console.error(`[StackLens] Batch item ${i + 1} failed:`, r.reason instanceof Error ? r.reason.message : String(r.reason));
      return {
        type: "text" as const,
        text: `### Error ${i + 1}\n\nAnalysis failed for this item. Please try it individually using explain_error.`,
      };
    });

    return { content };
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// ── Prompts (slash commands) ────────────────────────────────────────────────
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "debug",
      description: "Explain an error or stack trace using StackLens",
      arguments: [
        {
          name: "error",
          description: "Paste your stack trace or error here",
          required: true,
        },
      ],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "debug") {
    throw new Error(`Unknown prompt: ${request.params.name}`);
  }

  const errorText = request.params.arguments?.error ?? "";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please use the explain_error tool to analyze this:\n\n${errorText}`,
        },
      },
    ],
  };
});

// ── Start server ─────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  if (process.env.DEBUG) {
    console.error("StackLens MCP server running on stdio");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
