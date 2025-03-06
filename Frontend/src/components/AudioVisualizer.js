import React, { useState, useEffect, useRef } from "react";
import '../styles/App.css';

const AudioVisualizer = ({ isRecording, isAudioSetup, analyserRef, canvasRef }) => {
    const animationFrameRef = useRef(null);


    useEffect(() => {
        const visualize = (analyser, dataArray) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");


            const particles = [];
            const numParticles = 50;

            // Initialize particles with random positions and velocities
            for (let i = 0; i < numParticles; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.2,
                    vy: (Math.random() - 0.5) * 0.2,
                    size: Math.random() * 1 + 0.5,
                });
            }

            const draw = () => {
                analyser.getByteFrequencyData(dataArray);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "black";
                ctx.beginPath();
                ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
                ctx.fill();

                // Audio Sensitivity Factor
                const sensitivity = 0.001; // Adjust for greater/lesser sensitivity

                // Update particle positions and handle bouncing
                particles.forEach((p, i) => {
                    const audioIndex = Math.floor((i / numParticles) * dataArray.length);
                    const audioValue = dataArray[audioIndex];

                    // Update velocity based on audio level
                    p.vx += (Math.random() - 0.5) * audioValue * sensitivity;
                    p.vy += (Math.random() - 0.5) * audioValue * sensitivity;

                    p.x += p.vx;
                    p.y += p.vy;

                    // Bouncing logic
                    if (p.x < 0 || p.x > canvas.width) {
                        p.vx *= -1;
                    }
                    if (p.y < 0 || p.y > canvas.height) {
                        p.vy *= -1;
                    }
                });

                // Draw connections based on proximity and audio data
                ctx.strokeStyle = "white";
                for (let i = 0; i < numParticles; i++) {
                    for (let j = i + 1; j < numParticles; j++) {
                        const p1 = particles[i];
                        const p2 = particles[j];
                        const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                        const maxDistance = 100;

                        if (distance < maxDistance) {
                            const audioIndex = Math.floor(
                                (distance / maxDistance) * dataArray.length * 0.5
                            ); // Scale audio index
                            const opacity =
                                (1 - distance / maxDistance) * (dataArray[audioIndex] / 255);

                            ctx.globalAlpha = opacity;
                            ctx.lineWidth = opacity * 2;
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }
                }

                ctx.globalAlpha = 1; // Reset alpha

                // Draw particles
                particles.forEach((p) => {
                    ctx.fillStyle = "white";
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
                    ctx.fill();
                });

                animationFrameRef.current = requestAnimationFrame(draw);
            };
            draw();
        };


        if (isRecording && isAudioSetup && analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        visualize(analyserRef.current, dataArray);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
  }, [isRecording, isAudioSetup, analyserRef, canvasRef]);


    return (
        <canvas ref={canvasRef} className="visualizer"></canvas>
    );
};

export default AudioVisualizer;