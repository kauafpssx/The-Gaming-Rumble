import { API_CATEGORIES, type RouteDefinition } from "./routes";

function makeRequest(route: RouteDefinition) {
  const pathSegments = route.path.split("/").filter(Boolean);
  const pathVars = route.params
    .filter((p) => p.type === "path")
    .map((p) => ({ key: p.name, value: p.example ?? p.name }));
  const queryVars = route.params
    .filter((p) => p.type === "query")
    .map((p) => ({ key: p.name, value: p.example ?? "", description: p.name }));

  const rawPath = pathSegments.map((s) => (s.startsWith(":") ? `:${s.slice(1)}` : s)).join("/");
  const rawQs = queryVars.length ? "?" + queryVars.map((q) => `${q.key}=${q.value}`).join("&") : "";

  const req: Record<string, unknown> = {
    method: route.method,
    header: [{ key: "X-Api-Key", value: "{{apiKey}}", type: "text", disabled: false }],
    url: {
      raw: `{{baseUrl}}/${rawPath}${rawQs}`,
      host: ["{{baseUrl}}"],
      path: pathSegments,
      ...(queryVars.length ? { query: queryVars } : {}),
      ...(pathVars.length ? { variable: pathVars } : {}),
    },
    description: route.description,
  };

  if (route.body && route.bodyExample) {
    req.body = {
      mode: "raw",
      raw: route.bodyExample,
      options: { raw: { language: "json" } },
    };
    (req.header as unknown[]).push({ key: "Content-Type", value: "application/json" });
  }

  return req;
}

/** Builds and downloads a Postman/Insomnia-compatible collection JSON for every documented route. */
export function downloadPostmanCollection(apiKey: string) {
  const baseUrl = window.location.origin;

  const collection = {
    info: {
      name: "Gaming Rumble API",
      description: `API pública do ecossistema Gaming Rumble.\nBase URL: ${baseUrl}\nGerado em: ${new Date().toISOString()}`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      version: "1.0.0",
    },
    variable: [
      { key: "baseUrl", value: baseUrl, type: "string" },
      { key: "apiKey", value: apiKey.trim() || "", type: "string" },
    ],
    item: API_CATEGORIES.map((cat) => ({
      name: cat.label,
      item: cat.routes.map((route) => ({
        name: `${route.method} ${route.path}`,
        request: makeRequest(route),
      })),
    })),
  };

  const blob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gaming-rumble-api.json";
  a.click();
  URL.revokeObjectURL(url);
}
