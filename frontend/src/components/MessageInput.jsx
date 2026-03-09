import React, { useState } from "react";
import { Send } from "lucide-react";

const MessageInput = ({ onSend }) => {
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSend(newMessage.trim());
    setNewMessage("");
  };

  return (
    <div className="message-input-container">
      <textarea
        className="message-input"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <button
        className={`send-btn ${!newMessage.trim() ? "disabled" : ""}`}
        onClick={handleSend}
        disabled={!newMessage.trim()}
      >
        <Send size={18} color="white" />
      </button>
    </div>
  );
};

export default MessageInput;
