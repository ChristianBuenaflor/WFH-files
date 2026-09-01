import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Badge,
  Button,
  Toast,
  ToastContainer,
  Modal,
  Spinner,
} from "react-bootstrap";
import {
  Clock,
  Calendar,
  Shield,
  CheckCircle,
  BoxArrowInRight,
  GraphUpArrow,
  BoxArrowLeft,
} from "react-bootstrap-icons";
import * as faceapi from "face-api.js";
import "@/assets/style/global.css";
import api from "@/config/axios";
import ReportClockOutModal from "@/pages/attendance/components/modals/ReportClockOutModal.jsx";

const AttendanceOverview = () => {
  // ---------- Existing state ----------
  const [toasts, setToasts] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingIn, setLoadingIn] = useState(false);
  const [loadingOut, setLoadingOut] = useState(false);
  const [summary, setSummary] = useState({
    clockInTime: null,
    hoursToday: 0,
    isClockedIn: false,
    weekHours: 0,
    monthHours: 0,
    attendanceDays: 0,
  });
  const [attendanceData, setAttendanceData] = useState({
    presentPercentage: 0,
  });
  const [liveHoursToday, setLiveHoursToday] = useState(0);
  const [statusText, setStatusText] = useState("Off Duty");
  const [clockInTimestamp, setClockInTimestamp] = useState(null);
  const [sessionTime, setSessionTime] = useState("00:00:00");
  const [showReportModal, setShowReportModal] = useState(false);
  const [ccEmails, setCcEmails] = useState("");
  const [reportSubject, setReportSubject] = useState("");
  const [reportBody, setReportBody] = useState("");
  const monthlyTarget = 160;
  const [weekTrend, setWeekTrend] = useState(0);

  // ---------- Face verification state & refs ----------
  const videoRef = useRef(null);
  const canvasRef = useRef(null);          // hidden capture canvas
  const overlayRef = useRef(null);         // visible guide overlay

  const detectionInterval = useRef(null);
  const captureTimeout = useRef(null);

  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceAligned, setFaceAligned] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [cameraStream, setCameraStream] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clockAction, setClockAction] = useState(null); // 'in' or 'out'
  const clockActionRef = useRef(null);
  const [capturedFaceFile, setCapturedFaceFile] = useState(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [captureErrorMessage, setCaptureErrorMessage] = useState("");

  // ---------- Toast system ----------
  const showToast = useCallback((message, variant = "success") => {
    const id = Date.now();
    const toast = { id, message, variant };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // ---------- Live session timer ----------
  useEffect(() => {
    if (!summary.isClockedIn || !clockInTimestamp) {
      setSessionTime("00:00:00");
      return;
    }
    const interval = setInterval(() => {
      const now = new Date();
      const clockInDate = new Date(clockInTimestamp);
      const diffMs = now - clockInDate;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setSessionTime(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [summary.isClockedIn, clockInTimestamp]);

  // ---------- Fetch attendance data ----------
  const fetchMyAttendance = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const response = await api.get("/my-attendance");
      const data = response.data;

      if (data.isSuccess) {
        let clockInTime = null;
        let hoursToday = 0;
        let isClockedIn = false;

        if (data.todayRecord) {
          if (data.todayRecord.clock_in) {
            const date = new Date(data.todayRecord.clock_in);
            clockInTime = date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
            setClockInTimestamp(data.todayRecord.clock_in);
          }
          hoursToday = parseFloat(data.todayRecord.hours_worked) || 0;
          isClockedIn =
            data.todayRecord.clock_in && !data.todayRecord.clock_out;
        }

        const thisWeekHours = parseFloat(data.thisWeekHours) || 0;
        const thisMonthHours = parseFloat(data.thisMonthHours) || 0;
        const lastWeek = parseFloat(data.lastWeekHours) || 0;

        const trend = thisWeekHours - lastWeek;
        setWeekTrend(trend);

        const today = new Date();
        const currentDay = today.getDate();
        const lastDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        ).getDate();
        const expectedProgress = (currentDay / lastDayOfMonth) * monthlyTarget;
        const isOnTrack = thisMonthHours >= expectedProgress * 0.95;

        let presentPercentage = 0;
        let present = data.present || 0;
        let absent = data.absent || 0;
        const total = present + absent;
        if (total > 0) {
          presentPercentage = Math.round((present / total) * 100);
        }

        setSummary({
          clockInTime,
          hoursToday,
          isClockedIn,
          weekHours: thisWeekHours,
          monthHours: thisMonthHours,
          attendanceDays: parseInt(data.attendanceRate, 10) || 0,
        });

        setAttendanceData({
          presentPercentage,
        });

        setLiveHoursToday(hoursToday);
        setStatusText(isClockedIn ? "On Duty" : "Off Duty");
        if (!isOnTrack) {
          showToast("You are behind your monthly target.", "warning");
        }
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      showToast("Failed to load attendance data", "danger");
    } finally {
      setLoadingSummary(false);
    }
  }, [monthlyTarget, showToast]);

  // ---------- Load face‑api models ----------
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      } catch (error) {
        console.error("Face‑api model loading failed:", error);
        showToast("Failed to load face detection models", "danger");
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
  }, [showToast]);

  // ---------- Camera & face detection functions ----------
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available. Make sure you are on HTTPS.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      videoRef.current.srcObject = stream;
      setCameraStream(stream);
      videoRef.current.onloadedmetadata = () => startDetection();
    } catch (err) {
      console.error("Camera error:", err);
      let errorMessage = "Camera access denied. ";
      if (err.name === "NotAllowedError") {
        errorMessage += "Please grant camera permission in your browser.";
      } else if (err.name === "NotFoundError") {
        errorMessage += "No camera device found.";
      } else {
        errorMessage += err.message;
      }
      showToast(errorMessage, "danger");
      setShowFaceModal(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    if (detectionInterval.current) clearInterval(detectionInterval.current);
    if (captureTimeout.current) clearTimeout(captureTimeout.current);
    clockActionRef.current = null;
    setCameraStream(null);
  }, [cameraStream]);

  const drawGuide = () => {
    const canvas = overlayRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#00ff99";
    ctx.lineWidth = 3;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.32;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const startDetection = () => {
    detectionInterval.current = setInterval(async () => {
      if (!videoRef.current || isProcessing) return;
      drawGuide();
      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      );
      if (detection) {
        const box = detection.box;
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        const centerX = videoWidth / 2;
        const centerY = videoHeight / 2;
        const faceCenterX = box.x + box.width / 2;
        const faceCenterY = box.y + box.height / 2;
        const withinX = Math.abs(faceCenterX - centerX) < videoWidth * 0.15;
        const withinY = Math.abs(faceCenterY - centerY) < videoHeight * 0.2;

        if (withinX && withinY) {
          setFaceAligned(true);
          if (!captureTimeout.current) {
            captureTimeout.current = setTimeout(() => {
              autoCaptureAndSubmit();
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
    }, 500);
  };

  const autoCaptureAndSubmit = async () => {
    try {
      setIsProcessing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const byteString = atob(dataUrl.split(",")[1]);
      const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const file = new File([ab], "face.jpg", { type: mimeString });
      const formData = new FormData();
      formData.append("face_image", file);

      const activeAction = clockActionRef.current || clockAction;
      if (!activeAction) {
        throw new Error("Unable to determine clock action");
      }

      if (activeAction === "out") {
        setCapturedFaceFile(file);
        setVerificationMessage("Face verified. Please complete your report below.");
        setClockAction(null);
        setShowFaceModal(false);
        setShowReportModal(true);
        stopCamera();
      } else {
        setLoadingIn(true);
        await api.post("/attendance/clock-in", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast("Clocked In Successfully!");
        stopCamera();
        setClockAction(null);
        setShowFaceModal(false);
        await fetchMyAttendance();
      }
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Verification failed";
      setCaptureErrorMessage(message);
    } finally {
      setIsProcessing(false);
      setLoadingIn(false);
      captureTimeout.current = null;
    }
  };

  // ---------- Fetch data on mount ----------
  useEffect(() => {
    fetchMyAttendance();
  }, [fetchMyAttendance]);

  // ---------- Cleanup on unmount ----------
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ---------- Clock handlers (now open face modal) ----------
  const handleClockIn = () => {
    setLoadingIn(true);
    setClockAction("in");
    clockActionRef.current = "in";
    setCaptureErrorMessage("");
    setVerificationMessage("");
    setShowFaceModal(true);
    setTimeout(startCamera, 300);
  };

  const handleClockOut = () => {
    setLoadingIn(false);
    setClockAction("out");
    clockActionRef.current = "out";
    setCaptureErrorMessage("");
    setVerificationMessage("");
    setShowFaceModal(true);
    setTimeout(startCamera, 300);
  };

  // ---------- Report submit (with face data if available) ----------
  const handleReportSubmit = async () => {
    if (!reportBody || !reportBody.trim()) {
      showToast("Please enter a report before continuing.", "warning");
      return;
    }
    setLoadingOut(true);
    try {
      if (capturedFaceFile) {
        const clockOutData = new FormData();
        clockOutData.append("face_image", capturedFaceFile);
        clockOutData.append("report_today", reportBody);
        clockOutData.append("cc_emails", ccEmails);
        clockOutData.append("subject", reportSubject);

        await api.post("/attendance/clock-out", clockOutData, {
          headers: {
            "Content-Type": undefined,
          },
        });
      } else {
        const payload = {
          report_today: reportBody,
          cc_emails: ccEmails,
          subject: reportSubject,
        };
        await api.post("/attendance/clock-out", payload);
      }

      showToast("Clocked Out Successfully!");
      setCcEmails("");
      setReportSubject("");
      setReportBody("");
      setShowReportModal(false);
      setCapturedFaceFile(null);
      setVerificationMessage("");
      setClockAction(null);
      clockActionRef.current = null;
      await fetchMyAttendance();
    } catch (error) {
      console.error("Clock out submit failed:", error);
      const message =
        error.response?.data?.message || error.message || "Clock out failed";
      showToast(message, "danger");
    } finally {
      setLoadingOut(false);
    }
  };

  // ---------- Render ----------
  return (
    <>
      {/* Toast Notifications */}
      <ToastContainer
        position="top-end"
        className="p-3"
        style={{ zIndex: 1050 }}
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            className="glb-toast-success"
            onClose={() =>
              setToasts((prev) => prev.filter((t) => t.id !== toast.id))
            }
          >
            <Toast.Body
              className={toast.variant === "danger" ? "text-dark" : ""}
            >
              {toast.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      <Row className="g-3 g-md-4">
        {/* Left Column - Status & Clock Controls */}
        <Col lg={5}>
          <Card className="border-0 rounded-2 mb-3 shadow-sm overview-status-card">
            <Card.Body className="p-3 p-md-4">
              {loadingSummary ? (
                <div className="text-center py-4">
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                </div>
              ) : (
                <>
                  <div className="d-flex align-items-start justify-content-between mb-4 mb-md-4">
                    <div>
                      <small className="text-muted text-uppercase d-block mb-1 small-text-mobile">
                        CURRENT STATUS
                      </small>
                      <div className="d-flex align-items-center gap-2">
                        <h5 className="fw-bold mb-0">{statusText}</h5>
                        {summary.isClockedIn && (
                          <Badge bg="success" className="badge-checked-in">
                            CHECKED IN
                          </Badge>
                        )}
                      </div>
                    </div>
                    {summary.isClockedIn && (
                      <div
                        className="status-dot"
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          backgroundColor: "#10b981",
                        }}
                      ></div>
                    )}
                  </div>

                  {summary.isClockedIn && (
                    <div className="mb-3 mb-md-4 pb-3 pb-md-4 border-bottom">
                      <small className="text-muted text-uppercase d-block mb-2 small-text-mobile">
                        CURRENT SESSION
                      </small>
                      <h2 className="fw-bold mb-0 session-time">
                        {sessionTime}
                      </h2>
                    </div>
                  )}

                  <Row className="g-2 g-md-3 mb-3 mb-md-4">
                    <Col xs={6}>
                      <div className="d-flex align-items-center gap-2 gap-md-3">
                        <Clock
                          size={14}
                          className="text-muted d-none d-md-inline"
                        />
                        <Clock size={14} className="text-muted d-md-none" />
                        <div>
                          <small className="text-muted text-uppercase d-block small-text-mobile">
                            CLOCK IN
                          </small>
                          <p className="fw-bold mb-0 small-text-mobile">
                            {summary.clockInTime || "---"}
                          </p>
                        </div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="d-flex align-items-center gap-2 gap-md-3">
                        <Clock
                          size={14}
                          className="text-muted d-none d-md-inline"
                        />
                        <Clock size={14} className="text-muted d-md-none" />
                        <div>
                          <small className="text-muted text-uppercase d-block small-text-mobile">
                            HOURS TODAY
                          </small>
                          <p className="fw-bold mb-0 small-text-mobile">
                            {liveHoursToday.toFixed(2)} hrs
                          </p>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  <div className="d-flex gap-2 flex-column flex-sm-row">
                    <Button
                      variant="success"
                      className="px-3 py-2 flex-grow-1 btn-clock btn-sm-full"
                      onClick={handleClockIn}
                      disabled={summary.isClockedIn || loadingIn || loadingOut}
                    >
                      {loadingIn ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Clocking In...
                        </>
                      ) : (
                        <>
                          <BoxArrowInRight size={16} className="me-2" />
                          Clock In
                        </>
                      )}
                    </Button>
                    <Button
                      variant="danger"
                      className="px-3 py-2 flex-grow-1 btn-clock btn-sm-full"
                      onClick={handleClockOut}
                      disabled={!summary.isClockedIn || loadingIn || loadingOut}
                    >
                      {loadingOut ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Clocking Out...
                        </>
                      ) : (
                        <>
                          <BoxArrowLeft size={16} className="me-2" />
                          Clock Out
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column - Stats & Monthly Target */}
        <Col lg={7}>
          {/* Monthly Target Card */}
          <Card className="border-0 rounded-2 shadow-sm monthly-target-card mb-3 mb-md-3">
            <Card.Body className="p-3 p-md-4 monthly-target-body">
              <div className="d-flex justify-content-between align-items-start mb-2 mb-md-3">
                <div>
                  <small className="text-white text-uppercase d-block mb-1 small-text-mobile">
                    MONTHLY TARGET
                  </small>
                  <h3 className="fw-bold mb-0 text-white">
                    {monthlyTarget} hrs
                  </h3>
                </div>
                <GraphUpArrow size={24} className="text-white opacity-50" />
              </div>

              <div className="monthly-target-inner-box">
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <div>
                    <small className="d-block text-white-50 text-uppercase small-text-mobile">
                      Clock In
                    </small>
                    <div className="text-white fw-semibold fs-5">
                      {summary.clockInTime || "8:36 PM"}
                    </div>
                  </div>
                  <span className="target-mini-badge">Today</span>
                </div>
              </div>

              <small className="text-white text-opacity-75 d-block mb-2 mb-md-3 small-text-mobile">
                {loadingSummary
                  ? "Loading..."
                  : `${summary.monthHours.toFixed(2)} hrs completed • ${(
                      monthlyTarget - summary.monthHours
                    ).toFixed(2)} hrs remaining`}
              </small>
              <div className="progress" style={{ height: "6px" }}>
                <div
                  className="progress-bar bg-white"
                  role="progressbar"
                  style={{
                    width: `${Math.min(
                      (summary.monthHours / monthlyTarget) * 100,
                      100
                    )}%`,
                  }}
                  aria-valuenow={summary.monthHours}
                  aria-valuemin="0"
                  aria-valuemax={monthlyTarget}
                ></div>
              </div>
            </Card.Body>
          </Card>

          {/* Stats Cards Row */}
          <Row className="g-2 g-md-3 mb-3 mb-md-3">
            <Col xs={6} md={4}>
              <Card className="border-0 rounded-2 shadow-sm stat-info-card">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Calendar size={20} className="text-primary" />
                    <Badge
                      bg={weekTrend >= 0 ? "success" : "danger"}
                      className="badge-trend"
                    >
                      {weekTrend >= 0 ? "+" : ""}{weekTrend.toFixed(1)} hrs
                    </Badge>
                  </div>
                  <h5 className="fw-bold mb-1">
                    {loadingSummary ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : (
                      `${summary.weekHours.toFixed(2)} hrs`
                    )}
                  </h5>
                  <small className="text-muted">This Week</small>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={4}>
              <Card className="border-0 rounded-2 shadow-sm stat-info-card">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <CheckCircle size={20} className="text-success" />
                    <Badge bg="info" className="badge-trend">
                      On track
                    </Badge>
                  </div>
                  <h5 className="fw-bold mb-1">
                    {loadingSummary ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : (
                      `${summary.monthHours.toFixed(2)} hrs`
                    )}
                  </h5>
                  <small className="text-muted">This Month</small>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={4}>
              <Card className="border-0 rounded-2 shadow-sm stat-info-card">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Shield size={20} className="text-warning" />
                    <Badge bg="success" className="badge-trend">
                      {attendanceData.presentPercentage}%
                    </Badge>
                  </div>
                  <h5 className="fw-bold mb-1">
                    {loadingSummary ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : (
                      `${summary.attendanceDays} days`
                    )}
                  </h5>
                  <small className="text-muted">Attendance</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* ========== FACE VERIFICATION MODAL ========== */}
      <Modal
        show={showFaceModal}
        onHide={() => {
          setShowFaceModal(false);
          stopCamera();
          setCapturedFaceFile(null);
          setCaptureErrorMessage("");
          setClockAction(null);
          clockActionRef.current = null;
        }}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {clockAction === "out" ? "Clock Out" : "Clock In"} – Face Verification
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {loadingModels ? (
            <Spinner animation="border" />
          ) : (
            <div style={{ position: "relative" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: "100%", borderRadius: 10, transform: "scaleX(-1)" }}
              />
              <canvas
                ref={overlayRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: "scaleX(-1)",
                }}
              />
              <div className="mt-3">
                {isProcessing ? (
                  <Badge bg="warning">Processing...</Badge>
                ) : (
                  <Badge bg={faceAligned ? "success" : "danger"}>
                    {faceAligned
                      ? "Face Aligned – Capturing..."
                      : "Center your face inside the green circle"}
                  </Badge>
                )}
              </div>
              <div className="mt-2 text-muted">
                {loadingModels
                  ? "Loading face detection models..."
                  : isProcessing
                  ? "Please wait while we capture your image."
                  : faceAligned
                  ? "Hold still. Your face is aligned with the green circle."
                  : "Position your face inside the green circle and keep your head centered."}
              </div>
              {captureErrorMessage && (
                <div className="mt-3 alert alert-danger py-2 px-3 text-start" role="alert">
                  {captureErrorMessage}
                </div>
              )}
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </Modal.Body>
      </Modal>

      {/* Report Clock Out Modal (enhanced version) */}
      <ReportClockOutModal
        show={showReportModal}
        setShowReportModal={setShowReportModal}
        ccEmails={ccEmails}
        setCcEmails={setCcEmails}
        reportSubject={reportSubject}
        setReportSubject={setReportSubject}
        reportBody={reportBody}
        setReportBody={setReportBody}
        handleReportSubmit={handleReportSubmit}
        verificationMessage={verificationMessage}
        setVerificationMessage={setVerificationMessage}
      />
    </>
  );
};

export default AttendanceOverview;