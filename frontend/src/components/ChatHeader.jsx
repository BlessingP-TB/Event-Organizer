import React from "react";
import { ArrowLeft, Info } from "lucide-react";
import '../styles/components/_chat.scss';

const ChatHeader = ({ adminName, department, onBack }) => {
  return (
    <div className="chat-header">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={20} />
      </button>
      <div className="header-info">
        <h4>{adminName}</h4>
        <span>{department || "TUT Administration"}</span>
      </div>
      <button className="info-btn">
        <Info size={20} />
      </button>
    </div>
  );
};

export default ChatHeader;
