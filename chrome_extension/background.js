let mediaRecorder;
let audioChunks = [];

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "startLiveRecording") {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

        const formData = new FormData();
        formData.append("file", audioBlob, "live_audio.webm");

        try {
          const response = await fetch("http://localhost:5000/upload_video", {
            method: "POST",
            body: formData
          });

          const result = await response.json();
          chrome.storage.local.set({ liveSummary: result });
        } catch (err) {
          console.error("❌ Upload failed:", err);
        }
      };

      mediaRecorder.start();
      console.log("🎤 Live mic recording started");
      sendResponse({ started: true });
    } catch (error) {
      console.error("❌ getUserMedia error:", error);
      sendResponse({ started: false, error: error.toString() });
    }

    return true; // keeps the message channel open
  }

  if (message.action === "stopLiveRecording" && mediaRecorder) {
    mediaRecorder.stop();
    sendResponse({ stopped: true });
  }
});
