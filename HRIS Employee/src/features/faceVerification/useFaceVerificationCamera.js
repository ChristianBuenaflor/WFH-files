import { useCallback, useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export const useFaceVerificationCamera = ({ onFaceCaptured, showToast, onCameraError }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const detectionInterval = useRef(null);
  const captureTimeout = useRef(null);
  const cameraStartedRef = useRef(false);

  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceAligned, setFaceAligned] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [cameraStream, setCameraStream] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clockAction, setClockAction] = useState(null);
  const clockActionRef = useRef(null);
  const [capturedFaceFile, setCapturedFaceFile] = useState(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [captureErrorMessage, setCaptureErrorMessage] = useState("");

  const drawGuide = useCallback((canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#00ff99";
    ctx.lineWidth = 3;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.32;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
    if (captureTimeout.current) {
      clearTimeout(captureTimeout.current);
      captureTimeout.current = null;
    }
    setCameraStream(null);
    setFaceAligned(false);
    cameraStartedRef.current = false;
  }, [cameraStream]);

  const autoCaptureAndSubmit = useCallback(async () => {
    try {
      setIsProcessing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        throw new Error("Camera is not ready yet.");
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const byteString = atob(dataUrl.split(",")[1]);
      const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      const file = new File([ab], "face.jpg", { type: mimeString });
      const activeAction = clockActionRef.current || clockAction;

      if (!activeAction) {
        throw new Error("Unable to determine clock action");
      }

      return { file, activeAction };
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Verification failed";
      setCaptureErrorMessage(message);
      return null;
    } finally {
      setIsProcessing(false);
      if (captureTimeout.current) {
        clearTimeout(captureTimeout.current);
        captureTimeout.current = null;
      }
    }
  }, [clockAction]);

  const startDetection = useCallback(() => {
    if (detectionInterval.current) return;

    detectionInterval.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended || isProcessing) return;

      const canvas = overlayRef.current;
      if (canvas) {
        canvas.width = video.videoWidth || video.clientWidth;
        canvas.height = video.videoHeight || video.clientHeight;
        drawGuide(canvas);
      }

      try {
        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions()
        );

        if (detection) {
          const box = detection.box;
          const videoWidth = video.videoWidth || video.clientWidth;
          const videoHeight = video.videoHeight || video.clientHeight;
          const centerX = videoWidth / 2;
          const centerY = videoHeight / 2;
          const faceCenterX = box.x + box.width / 2;
          const faceCenterY = box.y + box.height / 2;
          const withinX = Math.abs(faceCenterX - centerX) < videoWidth * 0.15;
          const withinY = Math.abs(faceCenterY - centerY) < videoHeight * 0.2;

          if (withinX && withinY) {
            setFaceAligned(true);
            if (!captureTimeout.current) {
              captureTimeout.current = setTimeout(async () => {
                const result = await autoCaptureAndSubmit();
                if (result && onFaceCaptured) {
                  setCapturedFaceFile(result.file);
                  await onFaceCaptured(result);
                  setShowFaceModal(false);
                }
              }, 1500);
            }
          } else {
            setFaceAligned(false);
            if (captureTimeout.current) {
              clearTimeout(captureTimeout.current);
              captureTimeout.current = null;
            }
          }
        } else {
          setFaceAligned(false);
        }
      } catch {
        // ignore detection errors while the camera is settling
      }
    }, 500);
  }, [autoCaptureAndSubmit, drawGuide, isProcessing, onFaceCaptured]);

  const startCamera = useCallback(async () => {
    if (cameraStartedRef.current) return;
    cameraStartedRef.current = true;

    let stream;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available. Use HTTPS.");
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Video element not ready");
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      setCameraStream(stream);

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        if (video.readyState >= 2) resolve();
      });

      await video.play();
      startDetection();
    } catch (err) {
      console.error("Camera start error:", err);
      stream?.getTracks().forEach((track) => track.stop());
      let msg = "Camera access denied. ";
      if (err.name === "NotAllowedError") msg += "Please grant camera permission.";
      else if (err.name === "NotFoundError") msg += "No camera found.";
      else msg += err.message;

      if (showToast) showToast(msg, "danger");
      setCaptureErrorMessage(msg);
      setShowFaceModal(false);
      cameraStartedRef.current = false;
      if (onCameraError) onCameraError();
    }
  }, [onCameraError, showToast, startDetection]);

  const openFaceModal = useCallback((action) => {
    setClockAction(action);
    clockActionRef.current = action;
    setCaptureErrorMessage("");
    setVerificationMessage("");
    setShowFaceModal(true);
  }, []);

  const closeFaceModal = useCallback(() => {
    setShowFaceModal(false);
    stopCamera();
    setCapturedFaceFile(null);
    setCaptureErrorMessage("");
    setClockAction(null);
    clockActionRef.current = null;
    cameraStartedRef.current = false;
  }, [stopCamera]);

  useEffect(() => {
    if (!showFaceModal) {
      stopCamera();
      return;
    }

    if (loadingModels || cameraStartedRef.current || cameraStream) return;

    const startTimer = setTimeout(() => {
      if (videoRef.current && !cameraStartedRef.current) {
        startCamera();
      }
    }, 150);

    return () => clearTimeout(startTimer);
  }, [showFaceModal, loadingModels, cameraStream, startCamera, stopCamera]);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      } catch (error) {
        console.error("Face-api model loading failed:", error);
        if (showToast) showToast("Failed to load face detection models", "danger");
      } finally {
        setLoadingModels(false);
      }
    };

    loadModels();
  }, [showToast]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    overlayRef,
    showFaceModal,
    setShowFaceModal,
    faceAligned,
    loadingModels,
    cameraStream,
    isProcessing,
    clockAction,
    capturedFaceFile,
    verificationMessage,
    setVerificationMessage,
    captureErrorMessage,
    setCaptureErrorMessage,
    setCapturedFaceFile,
    openFaceModal,
    closeFaceModal,
    stopCamera,
    startCamera,
  };
};
