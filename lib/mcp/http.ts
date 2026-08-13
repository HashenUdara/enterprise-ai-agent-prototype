import { timingSafeEqual } from "node:crypto"

import {
  originValidationResponse,
  type AuthInfo,
} from "@modelcontextprotocol/server"

import { mcpHandler } from "@/lib/mcp/server"

function unauthorizedResponse() {
  return Response.json(
    {
      error: "invalid_token",
      error_description: "A valid MCP bearer token is required.",
    },
    {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer realm="enterprise-mcp"' },
    }
  )
}

function tokensMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  )
}

function allowedOriginHostnames() {
  return (process.env.MCP_ALLOWED_ORIGINS ?? "localhost,127.0.0.1")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export async function handleMcpPost(request: Request) {
  const originRejection = originValidationResponse(
    request,
    allowedOriginHostnames()
  )

  if (originRejection) {
    return originRejection
  }

  const expectedToken = process.env.MCP_BEARER_TOKEN

  if (!expectedToken) {
    return Response.json(
      { error: "server_configuration_error" },
      { status: 503 }
    )
  }

  const authorization = request.headers.get("authorization")
  const receivedToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!receivedToken || !tokensMatch(expectedToken, receivedToken)) {
    return unauthorizedResponse()
  }

  const authInfo: AuthInfo = {
    token: receivedToken,
    clientId: "enterprise-demo-client",
    scopes: ["mcp"],
  }

  return mcpHandler.fetch(request, { authInfo })
}

export function methodNotAllowedResponse() {
  return new Response("Method not allowed.", {
    status: 405,
    headers: { Allow: "POST" },
  })
}
