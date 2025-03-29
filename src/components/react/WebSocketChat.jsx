import React, { useEffect, useRef, useState } from "react";

export default function WebSocketChat() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    console.log("Create WebSocket connection");
    const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${globalThis.location.host}/api/ws`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    // Connection opened
    socket.addEventListener("open", () => {
      setConnected(true);
      console.log("Connected to WebSocket server");
    });

    // Listen for messages
    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    });

    // Connection closed
    socket.addEventListener("close", () => {
      setConnected(false);
      console.log("Disconnected from WebSocket server");
    });

    // Connection error
    socket.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
    });

    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Send a message to the server
  const sendMessage = (e) => {
    e.preventDefault();
    if (
      !inputMessage.trim() || !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const messageData = {
      message: inputMessage,
      timestamp: new Date().toISOString(),
    };

    socketRef.current.send(JSON.stringify(messageData));
    setInputMessage("");
  };

  return (
    <div className="websocket-chat">
      <div className="connection-status">
        Status: {connected
          ? <span className="connected">Connected</span>
          : <span className="disconnected">Disconnected</span>}
      </div>

      <div className="message-list">
        {messages.map((msg, i) => (
          <div key={i} className="message">
            <div className="message-content">{msg.message}</div>
            {msg.timestamp && (
              <div className="message-timestamp">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        ))}
      </div>

      <form className="message-input-form" onSubmit={sendMessage}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={!connected}
          className="message-input"
        />
        <button
          type="submit"
          disabled={!connected || !inputMessage.trim()}
          className="send-button"
        >
          Send
        </button>
      </form>

      <style jsx="true">
        {`
        .websocket-chat {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .connection-status {
          padding: 8px;
          margin-bottom: 10px;
          border-radius: 4px;
          font-weight: bold;
          text-align: center;
        }

        .connected {
          color: #2e7d32;
        }

        .disconnected {
          color: #c62828;
        }

        .message-list {
          border: 1px solid #eee;
          border-radius: 4px;
          height: 300px;
          overflow-y: auto;
          padding: 10px;
          margin-bottom: 15px;
          background-color: #f9f9f9;
        }

        .message {
          padding: 8px 12px;
          margin: 5px 0;
          border-radius: 18px;
          background-color: #e1f5fe;
          display: inline-block;
          max-width: 80%;
          word-wrap: break-word;
          clear: both;
        }

        .message-input-form {
          display: flex;
          gap: 10px;
        }

        .message-input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .send-button {
          padding: 10px 15px;
          background-color: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .send-button:hover {
          background-color: #1565c0;
        }

        .send-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        .message-timestamp {
          font-size: 11px;
          color: #666;
          margin-top: 2px;
        }
      `}
      </style>
    </div>
  );
}
