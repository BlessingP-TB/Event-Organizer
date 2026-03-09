import React from "react";

const MessageBubble = ({ text, sender, timestamp }) => {
  const isOrganizer = sender === "organizer";

  return (
    <div className={`message ${isOrganizer ? "organizer" : "admin"}`}>
      <div className="bubble">
        <p>{text}</p>
        <span className="timestamp">
          {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
