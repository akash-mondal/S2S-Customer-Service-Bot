import React, { useState, useEffect, useRef } from "react";
import StarField from "./components/StarField";
import ProfileCircle from "./components/ProfileCircle";
import MicButton from "./components/MicButton";
import AudioVisualizer from "./components/AudioVisualizer";
import "./styles/App.css";
import "ldrs/grid";
import { grid } from "ldrs";
import SocialMediaLinks from "./components/SocialMediaLinks";
import AudioRecorder from "./components/AudioRecorder";
import apiKeys from "./config/apiKeys";
import { transcribeAudio, generateAudio } from "./helpers/audioHelper";
import AiGeneratedCard from "./components/AiGeneratedCard";
import Wave from './components/Wave';

grid.register();

const bigBangQuotes = [
    "Bazinga!",
    "I don't need sleep, I need answers!",
    "According to the laws of physics, anything is possible.",
    "Soft kitty, warm kitty, little ball of fur...",
    "CHIMICHANGAS!",
    "I am the apex predator of the apartment.",
    "That's my spot.",
    "The human condition is a mystery to me.",
    "I've always been a bit of a nerd.",
    "I have a high tolerance for discomfort.",
    "I'm a very good listener. Except when I'm not.",
    "I have to agree, I'm pretty awesome.",
    "I'm not ignoring you, I'm just prioritizing.",
    "Friendship is a sacred bond, and should be treated as such."
];

const introMessages = [
    "Hello! This is your customer service agent speaking.",
    "Greetings, I'm your customer service representative.",
    "Good day! You're speaking with your customer service agent.",
    "Hi there, connecting you to your customer service agent.",
    "Welcome! Your customer service agent is now online."
];


const App = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [contentVisible, setContentVisible] = useState(false);
    const [audioType] = useState("audio/webm");
    const [error, setError] = useState(null);
    const [starSpeed, setStarSpeed] = useState(1);
    const [quote, setQuote] = useState("");
    const [hasClickedMicButton, setHasClickedMicButton] = useState(false);
    const [collectionName, setCollectionName] = useState(() => sessionStorage.getItem('collectionName') || '');
    const [userId, setUserId] = useState(() => sessionStorage.getItem('userId') || '');
    const [sessionId, setSessionId] = useState(() => sessionStorage.getItem('sessionId') || crypto.randomUUID());
    const [showConfigInputs, setShowConfigInputs] = useState(() => !(sessionStorage.getItem('collectionName') && sessionStorage.getItem('userId')));


    const canvasRef = useRef(null);
    const analyserRef = useRef(null);
    const audioRecorderRef = useRef(null);
    const audioRef = useRef(null);
    const introAudioPlaying = useRef(false);

    const { groq: GROQ_API_KEY, elevenlabs: ELEVENLABS_API_KEY } = apiKeys;

    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = 300;
            canvasRef.current.height = 150;
        }
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.addEventListener('play', () => setIsPlaying(true));
            audioRef.current.addEventListener('ended', () => {
                setIsPlaying(false);
                if (introAudioPlaying.current) {
                    introAudioPlaying.current = false;
                    setIsRecording(true);
                    if (audioRecorderRef.current) {
                        audioRecorderRef.current.control("recording");
                    }
                }
            });
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('play', () => setIsPlaying(true));
                audioRef.current.removeEventListener('ended', () => {});
            }
        };
    }, []);

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * bigBangQuotes.length);
        setQuote(bigBangQuotes[randomIndex]);

        const loadingTimer = setTimeout(() => {
            setLoading(false);
            const visibilityTimer = setTimeout(() => {
                setContentVisible(true);
            }, 200);
            return () => clearTimeout(visibilityTimer);
        }, 3000);

        return () => clearTimeout(loadingTimer);
    }, []);

    useEffect(() => {
        sessionStorage.setItem('collectionName', collectionName);
        sessionStorage.setItem('userId', userId);
        sessionStorage.setItem('sessionId', sessionId);
    }, [collectionName, userId, sessionId]);


    const handleAudioStop = async (file) => {
        if (!collectionName || !userId) {
            setError("Collection Name and User ID must be set.");
            return;
        }

        try {
            setError(null);
            setIsRecording(false);

            const transcription = await transcribeAudio(file, GROQ_API_KEY);

            const intermediateQuotes = [
                "Hmm, let me see...",
                "Okay, I understand.",
                "Just a moment...",
                "Let me check on that...",
                "Thinking about your question..."
            ];
            const randomQuote = intermediateQuotes[Math.floor(Math.random() * intermediateQuotes.length)];

            generateAudio(randomQuote, ELEVENLABS_API_KEY, audioRef, analyserRef, setStarSpeed)
                .catch(intermediateAudioError => {
                    console.error("Error generating intermediate audio:", intermediateAudioError);
                });

            const localApiResponse = await fetch("http://0.0.0.0:8000/chat/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    collection_name: collectionName,
                    query: transcription.text,
                    user_id: userId,
                    session_id: sessionId,
                }),
            });

            if (!localApiResponse.ok) {
                throw new Error(`Local API error: ${localApiResponse.status}`);
            }

            const localApiData = await localApiResponse.json();

            await generateAudio(localApiData.answer, ELEVENLABS_API_KEY, audioRef, analyserRef, setStarSpeed);

        } catch (error) {
            console.error("Error during processing:", error);
            setError(error.message || "An error occurred.");
            setIsPlaying(false);
        }
    };


    const toggleRecording = () => {
        if (!isPlaying) {
            if (!hasClickedMicButton) {
                setHasClickedMicButton(true);
                const randomIndex = Math.floor(Math.random() * introMessages.length);
                const introMessage = introMessages[randomIndex];
                introAudioPlaying.current = true;
                generateAudio(introMessage, ELEVENLABS_API_KEY, audioRef, analyserRef, setStarSpeed).catch(error => {
                    console.error("Error generating intro audio:", error);
                    introAudioPlaying.current = false;
                    setIsRecording(true);
                    if (audioRecorderRef.current) {
                        audioRecorderRef.current.control("recording");
                    }
                });
            } else {
                setIsRecording(!isRecording);
                if (audioRecorderRef.current) {
                    audioRecorderRef.current.control(isRecording ? "inactive" : "recording");
                }
            }
        }
    };

    const handleConfigSubmit = (e) => {
        e.preventDefault();
        if (collectionName && userId) {
            setShowConfigInputs(false);
        } else {
            setError("Collection Name and User ID are required.");
        }
    };

    return (
        <>
            {loading ? (
                <div className="loader-container">
                    <l-grid size="60" speed="1.5" color="white"></l-grid>
                    <p className="loading-quote">{quote}</p>
                </div>
            ) : (
                <div className={`app ${contentVisible ? "transition-visible" : ""}`}>
                    <Wave />
                    <AiGeneratedCard />
                    <StarField speed={starSpeed} />

                    {showConfigInputs && (
                        <div className="config-inputs-container"> {/* NEW CONTAINER DIV */}
                            <div className="config-inputs"> {/* Card-like form */}
                                <h2>Welcome! Please set up your session.</h2>
                                <form onSubmit={handleConfigSubmit}>
                                    <input
                                        type="text"
                                        placeholder="Collection Name"
                                        value={collectionName}
                                        onChange={(e) => setCollectionName(e.target.value)}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="User ID"
                                        value={userId}
                                        onChange={(e) => setUserId(e.target.value)}
                                        required
                                    />
                                    <button type="submit" className="config-submit-button"> {/* Styled Button */}
                                        Submit Configuration
                                    </button>
                                </form>
                                {error && <div className="error-message">{error}</div>}
                            </div>
                        </div>
                    )}

                    {!showConfigInputs && (
                        <div className="content">
                            <ProfileCircle analyserRef={analyserRef} />
                            <MicButton
                                isRecording={isRecording}
                                onClick={toggleRecording}
                                disabled={isPlaying}
                            />
                            <AudioVisualizer
                                isRecording={isRecording}
                                isAudioSetup={false}
                                analyserRef={analyserRef}
                                canvasRef={canvasRef}
                            />
                            {error && <div className="error-message">{error}</div>}
                        </div>
                    )}
                    <AudioRecorder
                        isRecording={isRecording}
                        setIsRecording={setIsRecording}
                        audioType={audioType}
                        onStop={handleAudioStop}
                        ref={audioRecorderRef}
                    />
                    <audio ref={audioRef} preload="auto" style={{ display: "none" }} />
                </div>
            )}
        </>
    );
};

export default App;

