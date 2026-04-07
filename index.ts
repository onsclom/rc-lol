Bun.serve({
  port: 3000,
  fetch(req) {
    const queryParams = new URL(req.url).searchParams;

    console.log(queryParams);

    return new Response("Hello via Bun!!");
  },
});

console.log("Server running on http://localhost:3000");
