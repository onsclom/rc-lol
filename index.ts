interface Command {
  keyword: string;
  handler: (args?: string[]) => string;
}

const registry: Command[] = [
  {
    keyword: "cal",
    handler: () => "https://www.recurse.com/calendar",
  },
  {
    keyword: "z",
    handler: (args) => {
      if (!args || args?.length == 0) {
        return "https://recurse.zulipchat.com";
      }
      return `https://recurse.zulipchat.com/#narrow/search/${encodeURIComponent(args.join(" "))}`;
    },
  },
];

Bun.serve({
  port: 3000,
  routes: {
    "/": {
      async GET(req) {
        const queryParams = new URL(req.url).searchParams;
        const query = queryParams.get("q");

        if (!query) {
          return Response.json({});
        }

        const [keyword, ...args] = query.split(" ");

        const cmd = registry.find((el) => el.keyword == keyword);
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

console.log("Server running on http://localhost:3000");
