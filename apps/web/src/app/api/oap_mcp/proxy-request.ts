import { NextRequest, NextResponse } from "next/server";

// This will contain the object which contains the access token
const MCP_TOKENS = process.env.MCP_TOKENS;
const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL;
const MCP_AUTH_REQUIRED = process.env.NEXT_PUBLIC_MCP_AUTH_REQUIRED === "true";

/**
 * Proxies requests from the client to the MCP server.
 * Extracts the path after '/api/oap_mcp', constructs the target URL,
 * forwards the request with necessary headers and body, and injects
 * the MCP authorization token if required.
 *
 * @param req The incoming NextRequest.
 * @returns The response from the MCP server.
 */
export async function proxyRequest(req: NextRequest): Promise<Response> {
  if (!MCP_SERVER_URL) {
    return new Response(
      JSON.stringify({
        message:
          "MCP_SERVER_URL environment variable is not set. Please set it to the URL of your MCP server, or NEXT_PUBLIC_MCP_SERVER_URL if you do not want to use the proxy route.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Extract the path after '/api/oap_mcp/'
  // Example: /api/oap_mcp/foo/bar -> /foo/bar
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/oap_mcp/, "");

  // Construct the target URL
  const targetUrlObj = new URL(MCP_SERVER_URL);
  targetUrlObj.pathname = `${targetUrlObj.pathname}${targetUrlObj.pathname.endsWith("/") ? "" : "/"}mcp${path}${url.search}`;
  const targetUrl = targetUrlObj.toString();

  // Prepare headers, forwarding original headers except Host
  // and adding Authorization
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Some headers like 'host' should not be forwarded
    if (key.toLowerCase() !== "host") {
      headers.append(key, value);
    }
  });

  const mcpAccessTokenCookie = req.cookies.get("X-MCP-Access-Token")?.value;
  // Authentication priority:
  // 1. X-MCP-Access-Token header
  // 2. X-MCP-Access-Token cookie
  // 3. MCP_TOKENS environment variable
  let accessToken: string | null = null;

  if (MCP_AUTH_REQUIRED) {
    if (mcpAccessTokenCookie) {
      accessToken = mcpAccessTokenCookie;
    } else if (MCP_TOKENS) {
      // Try to use MCP_TOKENS environment variable
      try {
        const { access_token } = JSON.parse(MCP_TOKENS);
        if (access_token) {
          accessToken = access_token;
        }
      } catch (e) {
        console.error("Failed to parse MCP_TOKENS env variable", e);
      }
    }

    // If we still don't have a token, return an error
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          message: "Failed to obtain access token. Please provide MCP_TOKENS environment variable or X-MCP-Access-Token cookie.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Set the Authorization header with the token
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  headers.set("Accept", "application/json, text/event-stream");

  // Determine body based on method
  let body: BodyInit | null | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    // For POST, PUT, PATCH, DELETE etc., forward the body
    body = req.body;
  }

  try {
    // Make the proxied request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });
    // Clone the response to create a new one we can modify
    const responseClone = response.clone();

    // Create a new response with the same status, headers, and body
    let newResponse: NextResponse;

    try {
      // Try to parse as JSON first
      const responseData = await responseClone.json();
      newResponse = NextResponse.json(responseData, {
        status: response.status,
        statusText: response.statusText,
      });
    } catch (_) {
      // If not JSON, use the raw response body
      const responseBody = await response.text();
      newResponse = new NextResponse(responseBody, {
        status: response.status,
        statusText: response.statusText,
      });
    }

    // Copy all headers from the original response
    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  } catch (error) {
    console.error("MCP Proxy Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Proxy request failed", error: errorMessage }),
      {
        status: 502, // Bad Gateway
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}