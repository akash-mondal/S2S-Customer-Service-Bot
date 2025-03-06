import React from "react";
import { FaPhoneAlt, FaPhoneSlash } from "react-icons/fa";
import '../styles/App.css';

const MicButton = ({ isRecording, onClick, disabled }) => {
  return (
    <button 
      className={`mic-button ${isRecording ? "recording" : ""} ${disabled ? "disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {isRecording ? <FaPhoneSlash /> : <FaPhoneAlt />}
      <span>{isRecording ? "" : ""}</span>
    </button>
  );
};

export default MicButton;
