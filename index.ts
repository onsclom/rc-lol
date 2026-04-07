const landingPage = Bun.file("./landing-page.html");

interface Command {
  keyword: string;
  aliases?: string[];
  handler: (args?: string[]) => string;
}

const registry: Command[] = [
  {
    keyword: "calendar",
    aliases: ["cal"],
    handler: () => "https://www.recurse.com/calendar",
  },
  {
    keyword: "zulip",
    aliases: ["z"],
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
    handler: () => "https://www.libib.com/u/recursecenter",
  },
  {
    keyword: "wiki",
    handler: () => "https://github.com/recursecenter/wiki/wiki",
  },
  {
    keyword: "community",
    aliases: ["forum"],
    handler: () => "https://community.recurse.com",
  },
  {
    keyword: "phoneroom",
    aliases: ["phone"],
    handler: () => "https://phoneroom.recurse.com",
  },
  {
    keyword: "rapidriter",
    aliases: ["rr"],
    handler: () => "https://rapidriter.rcdis.co",
  },
  {
    keyword: "rcade",
    handler: () => "https://rcade.dev",
  },
];

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
          return new Response(landingPage);
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
