import type { CallToolResult, JSONObject } from "@modelcontextprotocol/server"

import { db } from "@/lib/db"
import { mcpLogs } from "@/lib/db/schema"
import { EnterpriseValidationError } from "@/lib/enterprise/query-helpers"

type ExecuteLoggedToolOptions<TResult extends JSONObject> = {
  tool: string
  target?: string
  input: Record<string, unknown>
  run: () => Promise<TResult>
  formatText: (result: TResult) => string
}

function jsonRecord(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

function publicErrorMessage(error: unknown) {
  if (error instanceof EnterpriseValidationError) {
    return error.message
  }

  return "The enterprise data request failed. Retry the call or inspect MCP Activity for details."
}

async function writeFailureLog(
  tool: string,
  target: string | undefined,
  input: Record<string, unknown>,
  message: string
) {
  try {
    await db.insert(mcpLogs).values({
      tool,
      target,
      input: jsonRecord(input),
      result: { message },
      status: "FAILURE",
    })
  } catch {
    // The client still receives a safe error if observability is unavailable.
  }
}

export async function executeLoggedTool<TResult extends JSONObject>({
  tool,
  target,
  input,
  run,
  formatText,
}: ExecuteLoggedToolOptions<TResult>): Promise<CallToolResult> {
  try {
    const result = await run()

    await db.insert(mcpLogs).values({
      tool,
      target,
      input: jsonRecord(input),
      result: { count: result.count ?? null },
      status: "SUCCESS",
    })

    return {
      content: [{ type: "text", text: formatText(result) }],
      structuredContent: result,
    }
  } catch (error) {
    const message = publicErrorMessage(error)
    await writeFailureLog(tool, target, input, message)

    return {
      isError: true,
      content: [{ type: "text", text: message }],
    }
  }
}
