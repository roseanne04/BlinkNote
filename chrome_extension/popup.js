const toggleCheckbox = document.getElementById("toggle-live-summary");
const errorMsg = document.getElementById("error-msg");
const successMsg = document.getElementById("success-msg");
const processingMsg = document.getElementById("processing-msg");
const slackLink = document.getElementById("slack-link");

let mediaRecorder = null;
let audioChunks = [];

toggleCheckbox.addEventListener("change", async () => {
  if (toggleCheckbox.checked) {
    successMsg.textContent = "";
    errorMsg.textContent = "";
    processingMsg.classList.remove("hidden");
    processingMsg.textContent = "🎙️ Listening for meeting audio...";
    slackLink.classList.add("hidden");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        processingMsg.textContent = "⏳ Processing summary...";

        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const file = new File([audioBlob], "recorded_audio.webm", { type: "audio/webm" });

        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch("http://localhost:5000/summarize", {
            method: "POST",
            body: formData
          });

          const result = await response.json();

          if (result.summary) {
            successMsg.textContent = "✅ Summary ready!";
            errorMsg.textContent = "";
            processingMsg.classList.add("hidden");

            const summaryText = result.summary;
            const blob = new Blob([summaryText], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");
            downloadLink.href = url;
            downloadLink.download = "meeting_summary.txt";
            downloadLink.click();
            URL.revokeObjectURL(url);

            // ✅ Show Slack link if provided
            if (result.slack_url) {
              slackLink.href = result.slack_url;
              slackLink.classList.remove("hidden");
            }
          } else {
            errorMsg.textContent = "❌ No summary received from backend.";
            successMsg.textContent = "";
            processingMsg.classList.add("hidden");
            slackLink.classList.add("hidden");
          }
        } catch (err) {
          errorMsg.textContent = "❌ Error sending audio to backend: " + err.message;
          successMsg.textContent = "";
          processingMsg.classList.add("hidden");
          slackLink.classList.add("hidden");
        }

        toggleCheckbox.checked = false;
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 10000); // Record for 10 seconds
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDismissedError") {
        alert("🎤 Please allow microphone access for live summarization to work.");
      }
      errorMsg.textContent = "❌ getUserMedia failed: " + err.message;
      toggleCheckbox.checked = false;
      processingMsg.classList.add("hidden");
      slackLink.classList.add("hidden");
    }
  } else {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      processingMsg.classList.add("hidden");
    }
  }
});

// ✅ Transcript Upload
document.getElementById("upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  successMsg.textContent = "";
  errorMsg.textContent = "";
  processingMsg.classList.remove("hidden");
  processingMsg.textContent = "⏳ Uploading and summarizing transcript...";
  slackLink.classList.add("hidden");

  const fileInput = document.getElementById("meeting-file");
  const file = fileInput.files[0];
  if (!file) {
    errorMsg.textContent = "❌ Please select a transcript file.";
    processingMsg.classList.add("hidden");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://localhost:5000/summarize", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (result.summary) {
      successMsg.textContent = "✅ Summary ready!";
      errorMsg.textContent = "";
      processingMsg.classList.add("hidden");

      const blob = new Blob([result.summary], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "meeting_summary.txt";
      downloadLink.click();
      URL.revokeObjectURL(url);

      // ✅ Show Slack link if present
      if (result.slack_url) {
        slackLink.href = result.slack_url;
        slackLink.classList.remove("hidden");
      }
    } else {
      errorMsg.textContent = "❌ No summary received.";
      successMsg.textContent = "";
      processingMsg.classList.add("hidden");
      slackLink.classList.add("hidden");
    }
  } catch (err) {
    errorMsg.textContent = "❌ Error uploading transcript: " + err.message;
    successMsg.textContent = "";
    processingMsg.classList.add("hidden");
    slackLink.classList.add("hidden");
  }
});

// ✅ Video Upload
document.getElementById("video-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  successMsg.textContent = "";
  errorMsg.textContent = "";
  processingMsg.classList.remove("hidden");
  processingMsg.textContent = "⏳ Uploading and transcribing video...";
  slackLink.classList.add("hidden");

  const fileInput = document.getElementById("video-file");
  const file = fileInput.files[0];
  if (!file) {
    errorMsg.textContent = "❌ Please select a video file.";
    processingMsg.classList.add("hidden");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://localhost:5000/summarize", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (result.summary || result.message) {
      successMsg.textContent = "✅ Summary ready!";
      errorMsg.textContent = "";
      processingMsg.classList.add("hidden");

      const text = result.summary || result.message;
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "meeting_summary.txt";
      downloadLink.click();
      URL.revokeObjectURL(url);

      // ✅ Show Slack link if present
      if (result.slack_url) {
        slackLink.href = result.slack_url;
        slackLink.classList.remove("hidden");
      }
    } else {
      errorMsg.textContent = "❌ No summary returned.";
      successMsg.textContent = "";
      processingMsg.classList.add("hidden");
      slackLink.classList.add("hidden");
    }
  } catch (err) {
    errorMsg.textContent = "❌ Error uploading video: " + err.message;
    successMsg.textContent = "";
    processingMsg.classList.add("hidden");
    slackLink.classList.add("hidden");
  }
});
