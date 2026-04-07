import { streamText } from 'ai';
import { cohere } from '@ai-sdk/cohere';

const landingPage = Bun.file("./landing-page.html");

interface Command {
  keyword: string;
  aliases?: string[];
  description: string;
  handler: (args?: string[]) => string | Promise<Response> | Response;
}

const registry: Command[] = [
  {
    keyword: "ask",
    description: "Ask an AI a question (powered by Cohere)",
    handler: async (args) => {
      const query = args?.join(" ") || "Hello!";
      const result = await streamText({
        model: cohere("command-a-03-2025"),
        prompt: query,
      });

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RC Search - Ask AI</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fafafa; line-height: 1.6; margin: 0; }
    .container { max-width: 720px; margin: 0 auto; padding: 4rem 1.5rem; }
    .query { font-size: 1.25rem; font-weight: 600; margin-bottom: 2rem; color: #1a8c44; }
    .response { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.5rem; font-size: 1.05rem; }
    .response p:first-child { margin-top: 0; }
    .response p:last-child { margin-bottom: 0; }
    .response pre { background: #1a1a1a; color: #f4f4f4; padding: 1rem; overflow-x: auto; border-radius: 6px; }
    .response code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
    .response pre code { background: transparent; padding: 0; color: inherit; }
  </style>
</head>
<body>
  <div class="container">
    <div class="query">Q: ${query}</div>
    <div class="response" id="content"><em>Thinking...</em></div>
  </div>
  <script>
    let fullText = "";
    function append(text) {
      if (fullText === "") document.getElementById("content").innerHTML = "";
      fullText += text;
      document.getElementById("content").innerHTML = marked.parse(fullText);
    }
  </script>`));

          try {
            for await (const chunk of result.textStream) {
              const safeChunk = JSON.stringify(chunk).replace(/</g, '\\u003c');
              controller.enqueue(encoder.encode(`\n<script>append(${safeChunk});</script>`));
            }
          } catch (e) {
            const safeError = JSON.stringify(`\n\n[Error: ${e}]`).replace(/</g, '\\u003c');
            controller.enqueue(encoder.encode(`\n<script>append(${safeError});</script>`));
          }

          controller.enqueue(encoder.encode(`\n</body>\n</html>`));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },
  },
  {
    keyword: "calendar",
    aliases: ["cal"],
    description: "Jump straight to the RC calendar",
    handler: () => "https://www.recurse.com/calendar",
  },
  {
    keyword: "zulip",
    aliases: ["z"],
    description:
      "Open Zulip &mdash; or <strong>z your search</strong> to search directly",
    handler: (args) => {
      if (!args || args?.length == 0) {
        return "https://recurse.zulipchat.com";
      }
      return `https://recurse.zulipchat.com/#narrow/search/${encodeURIComponent(args.join(" "))}`;
    },
  },
  {
    keyword: "library",
    aliases: ["lib"],
    description: "Browse the RC library catalog",
    handler: () => "https://www.libib.com/u/recursecenter",
  },
  {
    keyword: "wiki",
    description: "Open the RC wiki on GitHub",
    handler: () => "https://github.com/recursecenter/wiki/wiki",
  },
  {
    keyword: "community",
    aliases: ["forum"],
    description: "Open the RC community forum",
    handler: () => "https://community.recurse.com",
  },
  {
    keyword: "phoneroom",
    aliases: ["phone"],
    description: "Open the RC phone room",
    handler: () => "https://phoneroom.recurse.com",
  },
  {
    keyword: "rapidriter",
    aliases: ["rr"],
    description: "Open Rapid Riter",
    handler: () => "https://rapidriter.rcdis.co",
  },
  {
    keyword: "rcade",
    description: "Open RCade",
    handler: () => "https://rcade.dev",
  },
  {
    keyword: "virtualrc",
    aliases: ["vrc"],
    description: "Open Virtual RC",
    handler: () => "https://recurse.rctogether.com/",
  },
];

function generateCommandsHtml(): string {
  const cards = registry
    .map((cmd) => {
      const label = cmd.aliases ? cmd.aliases[0] : cmd.keyword;
      return `        <div class="command">
          <code>${label}</code>
          <span>${cmd.description}</span>
        </div>`;
    })
    .join("\n");

  return `${cards}
        <div class="command">
          <code>anything else</code>
          <span>Falls through to a Google search</span>
        </div>`;
}

const port = process.env.PORT ?? 3000;

Bun.serve({
  port,
  development: process.env.DEV ? true : false,
  routes: {
    "/": {
      async GET(req) {
        const queryParams = new URL(req.url).searchParams;
        const query = queryParams.get("q");

        if (!query) {
          const html = (await landingPage.text()).replace(
            "<!--COMMANDS-->",
            generateCommandsHtml(),
          );
          return new Response(html, {
            headers: { "Content-Type": "text/html" },
          });
        }

        const [keyword, ...args] = query.split(" ");

        const cmd = keyword
          ? registry.find(
              (el) => el.keyword === keyword || el.aliases?.includes(keyword),
            )
          : null;
        if (cmd) {
          const result = await cmd.handler(args);
          if (typeof result === "string") {
            return Response.redirect(result, 302);
          }
          return result;
        }

        return Response.redirect(
          `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          302,
        );
      },
    },
  },
});

if (process.env.DEV) {
  const allNames = registry.flatMap((cmd) => [
    cmd.keyword,
    ...(cmd.aliases ?? []),
  ]);
  const seen = new Set<string>();
  for (const name of allNames) {
    if (seen.has(name)) {
      throw new Error(`Name collision detected for: "${name}"`);
    }
    seen.add(name);
  }

  console.log(`Server running on http://localhost:${port}`);
}
