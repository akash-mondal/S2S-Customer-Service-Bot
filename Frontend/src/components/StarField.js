import React, { useState, useEffect, useRef } from "react";
import '../styles/App.css'; // You might want to create a separate CSS file for this component

const StarField = () => {
  const [stars, setStars] = useState([]);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    // Initialize shooting stars
    const generateStars = () => {
      const numStars = 200; // Increased number of stars
      const newStars = Array.from({ length: numStars }, () => ({
        x: Math.random() * window.innerWidth * 5,
        y: Math.random() * window.innerHeight * 5,
        length: Math.random() * 100 + 40,
        speed: Math.random() * 4 + 1, // Increased speed range
        angle: Math.random() * 0.2 - 0.1,
        opacity: Math.random(),
      }));
      setStars(newStars);
    };

    generateStars();
    const starInterval = setInterval(generateStars, 20000);

    return () => {
      clearInterval(starInterval);
    };
  }, []);

  useEffect(() => {
    // Animation Frame for shooting stars
    const animateStars = () => {
      setStars((prevStars) =>
        prevStars.map((star) => {
          const newX = star.x - star.speed * Math.cos(Math.PI / 4 + star.angle);
          const newY = star.y - star.speed * Math.sin(Math.PI / 4 + star.angle);
          let resetX = newX;

          if (newX < -star.length) {
            resetX = window.innerWidth * 2 + star.length; // Move star off-screen to the right
          }

          return {
            ...star,
            x: resetX,
            y: newY,
          };
        })
      );
      animationFrameRef.current = requestAnimationFrame(animateStars);
    };

    animateStars();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <>
      {stars.map((star, index) => (
        <div
          key={index}
          className="shooting-star"
          style={{
            top: `${star.y}px`,
            left: `${star.x}px`,
            width: `${star.length}px`,
            transform: `rotate(${Math.atan2(
              -1 * Math.sin(Math.PI / 4 + star.angle),
              -1 * Math.cos(Math.PI / 4 + star.angle)
            )}rad)`,
            opacity: star.opacity,
          }}
        ></div>
      ))}
    </>
  );
};

export default StarField;