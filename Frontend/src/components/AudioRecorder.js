import React, { useState, useEffect, useRef, useImperativeHandle } from "react";
import AudioAnalyser from "react-audio-analyser";
import '../styles/App.css';
const AudioRecorder = React.forwardRef(({ isRecording, setIsRecording, audioType, onStop }, ref) => {
  const [status, setStatus] = useState("inactive");
  const audioAnalyserRef = useRef(null);

  useImperativeHandle(ref, () => ({
    control: (newStatus) => {
      setStatus(newStatus);
    }
  }));

  useEffect(() => {
    return () => {
      setStatus("inactive");
    };
  }, []);

  const handleStop = (blob) => {
    const file = new File([blob], "audio." + audioType.split("/")[1]);
    console.log("Audio File:", file);
    if (onStop) {
      onStop(file);
    }
  };

  const audioProps = {
    audioType,
    status,
    timeslice: 1000,
    startCallback: (e) => {
      console.log("succ start", e);
    },
    pauseCallback: (e) => {
      console.log("succ pause", e);
    },
    stopCallback: (e) => {
      handleStop(e);
      console.log("succ stop", e);
    },
    onRecordCallback: (e) => {
      console.log("recording", e);
    },
    errorCallback: (err) => {
      console.log("error", err);
    }
  };

  return <AudioAnalyser {...audioProps} />;
});

export default AudioRecorder;