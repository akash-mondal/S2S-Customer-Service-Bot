import React, { useState, useEffect, useRef } from "react";

const ProfileCircle = ({ analyserRef }) => {
  const [currentImage, setCurrentImage] = useState("");
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const particlesRef = useRef([]);
  const timeRef = useRef(0);
  const lastAudioLevelRef = useRef(0);
  const transitionRef = useRef(0);

  // Initialize particles with more sophisticated distribution
  const initializeParticles = () => {
    const particles = [];
    const particleCount = 200;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    for (let i = 0; i < particleCount; i++) {
      // Using golden ratio for more natural distribution
      const angle = i * 2 * Math.PI * goldenRatio;
      particles.push({
        angle,
        baseRadius: 210 + (Math.cos(angle * 3) * 30), // Increased base radius
        radius: Math.random() * 30 + 210, // Increased radius range
        speed: Math.random() * 0.001 + 0.0005,
        size: Math.random() * 2.25 + 0.75, // Increased particle size
        // White/silver palette with slight variations
        color: {
          h: Math.random() * 60 + 190,
          s: Math.random() * 10 + 5,
          l: Math.random() * 20 + 75
        },
        amplitude: Math.random() * 30 + 7.5, // Increased amplitude
        phase: Math.random() * Math.PI * 2,
        orbitOffset: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = particles;
  };

  useEffect(() => {
    const importImages = () => {
      const images = require.context("../assets/pfps", false, /\.(png|jpg)$/);
      const imagePaths = images.keys().map(images);
      const randomImage = imagePaths[Math.floor(Math.random() * imagePaths.length)];
      setCurrentImage(randomImage);
    };
    importImages();
    initializeParticles();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = Math.min(centerX, centerY) - 90; // Adjusted base radius

    const drawVisualizer = () => {
      timeRef.current += 0.016;
      animationFrameId.current = requestAnimationFrame(drawVisualizer);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let audioData = new Uint8Array(0);
      let averageAudioLevel = 0;
      if (analyserRef?.current) {
        audioData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(audioData);
        averageAudioLevel = audioData.reduce((acc, val) => acc + val, 0) / audioData.length;
      }

      const targetTransition = averageAudioLevel > 5 ? 1 : 0;
      transitionRef.current += (targetTransition - transitionRef.current) * 0.1;

      // Create gradient for the main circle
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius - 60, centerX, centerY, baseRadius + 60);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(0.5, 'rgba(220, 225, 235, 0.05)');
      gradient.addColorStop(1, 'rgba(200, 210, 255, 0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      const particles = particlesRef.current;
      
      // Draw connecting lines
      ctx.lineWidth = 0.45; // Increased line width
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        const audioIndex = Math.floor((i / particles.length) * audioData.length);
        const audioValue = audioData[audioIndex] || 0;
        
        const orbitAngle = p.angle + timeRef.current * p.speed + p.orbitOffset;
        const orbitRadius = p.baseRadius + Math.sin(timeRef.current * 0.5 + p.phase) * p.amplitude;
        const audioRadius = p.baseRadius + (audioValue / 255) * 75; // Increased audio reaction
        const finalRadius = orbitRadius * (1 - transitionRef.current) + audioRadius * transitionRef.current;
        
        const x = centerX + Math.cos(orbitAngle) * finalRadius;
        const y = centerY + Math.sin(orbitAngle) * finalRadius;

        // Connect particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const angle2 = p2.angle + timeRef.current * p2.speed + p2.orbitOffset;
          const radius2 = p2.baseRadius + (audioData[Math.floor((j / particles.length) * audioData.length)] || 0) / 255 * 75;
          
          const x2 = centerX + Math.cos(angle2) * radius2;
          const y2 = centerY + Math.sin(angle2) * radius2;
          
          const distance = Math.hypot(x2 - x, y2 - y);
          if (distance < 90) { // Increased connection distance
            const opacity = (1 - distance / 90) * 0.15 * (1 + (audioValue / 255) * 0.5);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l}%, ${opacity})`;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p, i) => {
        const audioIndex = Math.floor((i / particles.length) * audioData.length);
        const audioValue = audioData[audioIndex] || 0;
        
        const orbitAngle = p.angle + timeRef.current * p.speed + p.orbitOffset;
        const orbitRadius = p.baseRadius + Math.sin(timeRef.current * 0.5 + p.phase) * p.amplitude;
        const audioRadius = p.baseRadius + (audioValue / 255) * 75;
        const finalRadius = orbitRadius * (1 - transitionRef.current) + audioRadius * transitionRef.current;
        
        const x = centerX + Math.cos(orbitAngle) * finalRadius;
        const y = centerY + Math.sin(orbitAngle) * finalRadius;

        const particleSize = p.size * (1 + (audioValue / 255) * 2);
        ctx.beginPath();
        ctx.arc(x, y, particleSize, 0, Math.PI * 2);
        
        const brightness = 75 + (audioValue / 255) * 25;
        ctx.fillStyle = `hsla(${p.color.h}, ${p.color.s}%, ${brightness}%, ${0.4 + (audioValue / 255) * 0.6})`;
        ctx.fill();
      });

      // Draw outer glow ring
      const ringWidth = 3 + (averageAudioLevel / 255) * 4.5; // Increased ring width
      const ringGradient = ctx.createRadialGradient(
        centerX, centerY, baseRadius - ringWidth,
        centerX, centerY, baseRadius + ringWidth * 2
      );
      
      ringGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      ringGradient.addColorStop(0.5, 'rgba(240, 245, 255, 0.1)');
      ringGradient.addColorStop(1, 'rgba(230, 240, 255, 0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = ringGradient;
      ctx.lineWidth = ringWidth;
      ctx.stroke();
    };

    drawVisualizer();
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [analyserRef]);

  return (
    <div className="circle-container">
      <canvas
        ref={canvasRef}
        width={750}  // Increased from 500 to 750
        height={750} // Increased from 500 to 750
        className="visualizer-canvas"
      />
      <div className="circle">
        {currentImage && (
          <img src={currentImage} alt="Profile" className="center-image" />
        )}
      </div>
    </div>
  );
};

export default ProfileCircle;