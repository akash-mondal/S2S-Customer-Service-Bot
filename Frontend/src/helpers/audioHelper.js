import Groq from "groq-sdk";

// src/helpers/audioHelper.js
export const transcribeAudio = async (file, GROQ_API_KEY) => {
    try {
      const groq = new Groq({
        apiKey: GROQ_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      const transcription = await groq.audio.transcriptions.create({
        file: file,
        model: "whisper-large-v3",
        response_format: "verbose_json",
      });
    return transcription;
    } catch (error) {
        console.error("Error during transcription:", error);
      throw error;
    }
};



export const generateAudio = async (text, ELEVENLABS_API_KEY, audioRef, analyserRef, setStarSpeed) => {
  try {
    const voiceId = "Z3R5wn05IrDiVCyEkUrK"; // Your voice ID

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          model_id: "eleven_flash_v2_5",
          text: text,
          voice_settings: { similarity_boost: 1, stability: 1 ,useSpeakerBoost: true , style: 0.5 },
          enableLogging: true
        }),
      }
    );

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.type = "audio/mpeg";
      await audioRef.current.play();

      // Start visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioRef.current);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      analyserRef.current = analyser;

      // Get frequency data and adjust star speed
      const updateStarSpeed = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average frequency value and map it to star speed
        const averageFrequency = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setStarSpeed((averageFrequency / 255) * 30); // Map average frequency to speed
      };

      // Update star speed continuously
      setInterval(updateStarSpeed, 100);
      console.log("Audio playback started");
    }
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
};
