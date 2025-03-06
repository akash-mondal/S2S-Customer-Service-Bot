import React from "react";
import StarField from "./StarField";
import ProfileCircle from "./ProfileCircle";
import AudioVisualizer from "./AudioVisualizer";
import "./App.css";

const MainContent = ({ isRecording, isAudioSetup, analyserRef, canvasRef }) => {
    return (
        <div className="app">
          <StarField/>
            <div className="content">
                <ProfileCircle/>
                <AudioVisualizer
                    isRecording={isRecording}
                    isAudioSetup={isAudioSetup}
                    analyserRef={analyserRef}
                    canvasRef={canvasRef}
                />
            </div>
        </div>
    );
};

export default MainContent;