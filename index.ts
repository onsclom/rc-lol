import index from "./index.html";

// rc cal -> calendar
// fallback -> google

Bun.serve({
  port: 3000,
  routes: {
    "/frontend": index,

    "/": {
      async GET(req) {
        const queryParams = new URL(req.url).searchParams;
        console.log(queryParams);

        const qParam = queryParams.get("q");
        if (!qParam) {
          return Response.json({});
        }

        if (qParam === "cal") {
          // redirect to https://www.recurse.com/calendar
          return Response.redirect("https://www.recurse.com/calendar", 302);
        } else {
          // fallback should use google
          return Response.redirect(
            `https://www.google.com/search?q=${qParam}`,
            302,
          );
        }
      },
    },
  },
});

// rc next event

console.log("Server running on http://localhost:3000");
