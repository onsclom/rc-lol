const landingPage = Bun.file("./landing-page.html");

interface Command {
  keyword: string;
  aliases?: string[];
  description: string;
  handler: (args?: string[]) => string;
}

const registry: Command[] = [
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
          return Response.redirect(cmd.handler(args), 302);
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
