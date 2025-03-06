import React from "react";
import '../styles/App.css'; // or SocialMediaLinks.css if you prefer
import { FaInstagram, FaLinkedin } from "react-icons/fa";

const SocialMediaLinks = () => {
  return (
    <div className="social-icons">
      <a
        href="https://www.instagram.com/your-instagram-profile"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FaInstagram />
      </a>
      <a
        href="https://www.linkedin.com/in/your-linkedin-profile"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FaLinkedin />
      </a>
    </div>
  );
};

export default SocialMediaLinks;