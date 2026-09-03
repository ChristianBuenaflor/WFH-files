import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  Row,
  Col,
  Badge,
  Button,
  Table,
  Dropdown,
  Pagination,
  Modal,
  Spinner,
} from "react-bootstrap";
import * as faceapi from "face-api.js";
import api from "@/config/axios";
import {
  Clock,
  DoorOpen,
  ThreeDots,
  ChevronLeft,
  ChevronRight,
  GraphUpArrow,
  Calendar,
  Shield,
  CheckCircle,
} from "react-bootstrap-icons";
import { Link } from "react-router-dom";

const OverviewTab = ({
  formattedDate,
  formattedTime,
  loadingSummary,
  badgeVariant,
  badgeText,
  summary,
  sessionTime,
  liveHoursToday,
  statusText,
  handleClockIn,
  handleOpenAdjustModal,
  setShowReportModal,
  loadingIn,
  loadingOut,
  isClockOutDisabled,
  showDropdown,
  setShowDropdown,
  formatDate,
  formatTimeRange,
  formatHoursWorked,
}) => {
  const ROWS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

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

  // Reset pagination when recent attendance data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [summary?.recentAttendance?.length]);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      } catch (error) {
        console.error("Face-api model loading failed:", error);
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    if (cameraStartedRef.current) return;
    cameraStartedRef.current = true;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available. Make sure you are on HTTPS.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });

      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element is not ready yet.");
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
      console.error("Camera error:", err);
      let errorMessage = "Camera access denied. ";
      if (err.name === "NotAllowedError") {
        errorMessage += "Please grant camera permission in your browser.";
      } else if (err.name === "NotFoundError") {
        errorMessage += "No camera device found.";
      } else {
        errorMessage += err.message;
      }
      cameraStartedRef.current = false;
      setCaptureErrorMessage(errorMessage);
      setShowFaceModal(false);
    }
  };

  const stopCamera = () => {
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
    cameraStartedRef.current = false;
    clockActionRef.current = null;
    setCameraStream(null);
    setFaceAligned(false);
  };

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
        await api.post("/attendance/clock-in", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setShowFaceModal(false);
        setClockAction(null);
        await fetchMyAttendance();
      }
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Verification failed";
      setCaptureErrorMessage(message);
    } finally {
      setIsProcessing(false);
      captureTimeout.current = null;
    }
  };

  useEffect(() => {
    if (!showFaceModal) {
      stopCamera();
      return;
    }

    if (loadingModels || cameraStartedRef.current || cameraStream) {
      return;
    }

    const startTimer = setTimeout(() => {
      if (videoRef.current && !cameraStartedRef.current) {
        startCamera();
      }
    }, 150);

    return () => clearTimeout(startTimer);
  }, [showFaceModal, loadingModels, cameraStream]);

  const handleClockInClick = () => {
    setClockAction("in");
    clockActionRef.current = "in";
    setCaptureErrorMessage("");
    setVerificationMessage("");
    setShowFaceModal(true);
  };

  const handleClockOutClick = () => {
    setClockAction("out");
    clockActionRef.current = "out";
    setCaptureErrorMessage("");
    setVerificationMessage("");
    setShowFaceModal(true);
  };

  // Calculate paginated recent attendance data
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedRecentAttendance =
    summary?.recentAttendance?.slice(startIndex, endIndex) || [];
  const totalPages = Math.ceil(
    (summary?.recentAttendance?.length || 0) / ROWS_PER_PAGE,
  );

  // Pagination component renderer
  const PaginationControls = ({ currentPage, setCurrentPage, totalPages }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mt-3 pt-3 border-top">
        <div className="text-muted small">
          Page {currentPage} of {totalPages}
        </div>
        <div className="pagination-controls d-flex flex-wrap gap-1 justify-content-start justify-content-sm-end">
          <Button
            variant="outline-secondary"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="me-1"
          >
            <ChevronLeft size={16} className="d-none d-sm-inline" /> <span className="d-sm-none">Prev</span>
          </Button>

          <div className="d-flex flex-wrap gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "primary" : "outline-secondary"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="page-btn"
                style={{ minWidth: "32px" }}
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline-secondary"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="ms-1"
          >
            <span className="d-sm-none">Next</span> <ChevronRight size={16} className="d-none d-sm-inline" />
          </Button>
        </div>
      </div>
    );
  };
  return (
    <>
      <Row className="g-3 g-md-4">
        {/* Left Column - Status & Clock Controls */}
        <Col lg={5}>
          {/* Status Card */}
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
                  <div className="d-flex align-items-start justify-content-between mb-4">
                    <div>
                      <small className="text-muted text-uppercase d-block mb-1">CURRENT STATUS</small>
                      <div className="d-flex align-items-center gap-2">
                        <h5 className="fw-bold mb-0">{statusText}</h5>
                        <Badge bg="success" className="badge-checked-in">
                          CHECKED IN
                        </Badge>
                      </div>
                    </div>
                    <div className="status-dot" style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: "#10b981",
                    }}></div>
                  </div>

                  <div className="mb-4 pb-4 border-bottom">
                    <small className="text-muted text-uppercase d-block mb-2">CURRENT SESSION</small>
                    <h2 className="fw-bold mb-0 session-time">
                      {sessionTime}
                    </h2>
                  </div>

                  <Row className="g-3 mb-4">
                    <Col xs={6}>
                      <div className="d-flex align-items-center gap-2">
                        <Clock size={16} className="text-muted" />
                        <div>
                          <small className="text-muted text-uppercase d-block">CLOCK IN</small>
                          <p className="fw-bold mb-0">{summary.clockInTime || "---"}</p>
                        </div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="d-flex align-items-center gap-2">
                        <Clock size={16} className="text-muted" />
                        <div>
                          <small className="text-muted text-uppercase d-block">HOURS TODAY</small>
                          <p className="fw-bold mb-0">{liveHoursToday.toFixed(2)} hrs</p>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  <div className="d-flex gap-2">
                    <Button
                      variant="success"
                      className="px-3 py-2 flex-grow-1 btn-clock"
                      onClick={handleClockInClick}
                      disabled={
                        summary.isClockedIn ||
                        loadingSummary ||
                        loadingIn ||
                        loadingOut
                      }
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
                          <Clock size={16} className="me-2" />
                          Clock In
                        </>
                      )}
                    </Button>
                    <Button
                      variant="danger"
                      className="px-3 py-2 flex-grow-1 btn-clock"
                      onClick={handleClockOutClick}
                      disabled={
                        !summary.isClockedIn ||
                        loadingSummary ||
                        isClockOutDisabled ||
                        loadingIn ||
                        loadingOut
                      }
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
                          <DoorOpen size={16} className="me-2" />
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
          {/* Stats Cards Row */}
          <Row className="g-2 mb-3">
            <Col xs={6} md={4}>
              <Card className="border-0 rounded-2 shadow-sm stat-info-card">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Calendar size={20} className="text-primary" />
                    <Badge bg="success" className="badge-trend">+2.4 hrs</Badge>
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
                    <Badge bg="info" className="badge-trend">On track</Badge>
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
                    <Badge bg="success" className="badge-trend">100%</Badge>
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

          {/* Monthly Target Card */}
          <Card className="border-0 rounded-2 shadow-sm monthly-target-card">
            <Card.Body className="p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <small className="text-white text-uppercase d-block mb-1">MONTHLY TARGET</small>
                  <h3 className="fw-bold mb-0 text-white">160 hrs</h3>
                </div>
                <GraphUpArrow size={24} className="text-white opacity-50" />
              </div>
              <small className="text-white text-opacity-75 d-block mb-3">
                {loadingSummary ? (
                  "Loading..."
                ) : (
                  `${summary.monthHours.toFixed(2)} hrs completed • ${(160 - summary.monthHours).toFixed(2)} hrs remaining`
                )}
              </small>
              <div className="progress" style={{ height: "8px" }}>
                <div
                  className="progress-bar bg-white"
                  role="progressbar"
                  style={{
                    width: `${Math.min((summary.monthHours / 160) * 100, 100)}%`,
                  }}
                  aria-valuenow={summary.monthHours}
                  aria-valuemin="0"
                  aria-valuemax="160"
                ></div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
          )}
        </Modal.Body>
      </Modal>

      {!loadingSummary && summary.recentAttendance.length > 0 && (
        <Card className="recent-attendance-card mb-4">
          <Card.Body className="p-0">
            <div className="section-header-inline recent-attendance-header px-4 pt-4">
              <div>
                <h4 className="section-title mb-1">Recent Attendance</h4>
                <p className="section-subtitle">
                  Your recent attendance records
                </p>
              </div>

              <div>
                <Link onClick={() => setShowDropdown(!showDropdown)}>
                  <ThreeDots className="text-secondary" />
                </Link>

                <Dropdown
                  show={showDropdown}
                  onClick={() => setShowDropdown(false)}
                >
                  <Dropdown.Toggle
                    as="div"
                    className="text-secondary absent-dropdown-toggle"
                  />

                  <Dropdown.Menu>
                    <Dropdown.Item>Request to clock in</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>

            <div className="recent-attendance-table-wrapper">
              <Table responsive hover className="mb-0 report-table recent-attendance-table align-middle">
                <thead className="recent-attendance-header-row">
                  <tr>
                    <th>Date</th>
                    <th>Att. Status</th>
                    <th>Adj. Status</th>
                    <th>Time</th>
                    <th>Hours</th>
                    <th>Late</th>
                    <th>Deduction</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRecentAttendance.map((record, index) => (
                    <tr key={record.id || index} className="recent-attendance-row">
                      <td className="fw-medium">
                        {formatDate(record.clock_in)}
                      </td>

                      <td>
                        {record.status === "Present" ? (
                          <Badge bg="success">Present</Badge>
                        ) : record.status === "Late" ? (
                          <Badge bg="warning">Late</Badge>
                        ) : record.status === "Pending" ? (
                          <Badge bg="info">Pending</Badge>
                        ) : (
                          <Badge bg="danger">Absent</Badge>
                        )}
                      </td>

                      <td>
                        {record.adjustment_status === "approved" ? (
                          <Badge bg="success">Approved</Badge>
                        ) : record.adjustment_status === "pending" ? (
                          <Badge bg="warning">Pending</Badge>
                        ) : (
                          <Badge bg="secondary">No Adjustment</Badge>
                        )}
                      </td>

                      <td>
                        {formatTimeRange(record.clock_in, record.clock_out)}
                      </td>

                      <td>{formatHoursWorked(record.hours_worked)}</td>

                      <td>
                        {record.is_late === 1 ? (
                          <Badge bg="warning">{record.late_minutes} min</Badge>
                        ) : (
                          <Badge bg="success">On Time</Badge>
                        )}
                      </td>

                      <td>
                        {record.late_deduction > 0 ? (
                          <span className="text-danger fw-medium">
                            -{record.late_deduction}
                          </span>
                        ) : (
                          <span className="text-success">—</span>
                        )}
                      </td>

                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="px-3 recent-attendance-action"
                          onClick={() => handleOpenAdjustModal(record)}
                        >
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <PaginationControls
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
          </Card.Body>
        </Card>
      )}
    </>
  );
};

export default React.memo(OverviewTab);
