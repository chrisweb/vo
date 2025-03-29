import type { APIRoute } from "astro";

export const GET: APIRoute = ({ request }) => {
  // Extract the upgrade header from the incoming request
  const upgradeHeader = request.headers.get("upgrade");

  // If the request isn't a WebSocket connection request, return a 400 error
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Request is not a WebSocket upgrade", { status: 400 });
  }

  try {
    // Create a new WebSocket server
    const { socket, response } = Deno.upgradeWebSocket(request);

    // Handle WebSocket connections
    socket.onopen = () => {
      console.log("WebSocket connection opened");
      socket.send(
        JSON.stringify({ message: "Connected to WebSocket server!" }),
      );
    };

    // Handle incoming messages
    socket.onmessage = (event) => {
      console.log("Received message:", event.data);

      try {
        const data = JSON.parse(event.data);

        // Echo the message back to the client
        socket.send(JSON.stringify({
          type: "echo",
          message: data.message,
          timestamp: new Date().toISOString(),
        }));
      } catch (error) {
        console.log("Error parsing message:", error);
        // If there's an error parsing the message, send an error message back
        socket.send(JSON.stringify({
          type: "error",
          message: "Failed to parse message",
        }));
      }
    };

    // Handle WebSocket errors
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // Handle WebSocket disconnections
    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    // Return the WebSocket response
    return response;
  } catch (error) {
    console.error("WebSocket upgrade error:", error);
    return new Response("WebSocket upgrade failed", { status: 500 });
  }
};
