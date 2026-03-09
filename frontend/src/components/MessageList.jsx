import React, { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

const MessageList = ({ messages }) => {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="messages" ref={listRef}>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} {...msg} />
      ))}
    </div>
  );
};

export default MessageList;
