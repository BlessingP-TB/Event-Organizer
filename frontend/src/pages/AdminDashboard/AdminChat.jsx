import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import ChatHeader from "../../components/ChatHeader";
import MessageList from "../../components/MessageList";
import MessageInput from "../../components/MessageInput";
import '../../styles/components/_chat.scss';

const AdminChat = () => {
  const navigate = useNavigate();

  // Organizer information (can be dynamic in the future)
  const organizerName = "Jane Smith";
  const organizerEmail = "jane.organizer@example.com";

  // Static conversation with this organizer
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hello, I need help setting up my event page.",
      sender: "organizer",
      timestamp: new Date("2025-10-20T09:00:00"),
    },
  ]);

  const handleSend = (text) => {
    const newMsg = {
      id: Date.now().toString(),
      text,
      sender: "admin",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);

    setTimeout(() => {
      const reply = {
        id: (Date.now() + 1).toString(),
        text: "Thanks! That answers my question.",
        sender: "organizer",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
    }, 1500);
  };

  return (
    <div className="chat-container">
      <ChatHeader
        adminName={`Organizer: ${organizerName} (${organizerEmail})`}
        department="Organizer Support"
        onBack={() => navigate("/admin")} // ✅ Navigate to AnalyticsDashboard
      />
      <MessageList messages={messages} />
      <MessageInput onSend={handleSend} />
    </div>
  );
};

export default AdminChat;
