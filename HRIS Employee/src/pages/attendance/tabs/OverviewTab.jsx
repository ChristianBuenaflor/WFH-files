import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "react-bootstrap-icons";

const OverviewTab = ({
  loadingSummary,
  summary,
  sessionTime,
  liveHoursToday,
  statusText,
  handleOpenAdjustModal,
  setShowReportModal,
  loadingIn,
  loadingOut,
  showDropdown,
  setShowDropdown,
  formatDate,
  formatTimeRange,
  formatHoursWorked,
  fetchMyAttendance,
  showToast,
}) => {
  const ROWS_PER_PAGE = 10;
  const monthlyTarget = 160;
  const [selectedTargetMonth, setSelectedTargetMonth] = useState(
    new Date().getMonth() + 1,
  );
  const [selectedTargetYear, setSelectedTargetYear] = useState(
    new Date().getFullYear(),
  );
  const [currentPage, setCurrentPage] = useState(1);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const detectionInterval = useRef(null);
  const captureTimeout = useRef(null);
  const cameraStartedRef = useRef(false);
  const startDetectionRef = useRef(null);

  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceAligned, setFaceAligned] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [cameraStream, setCameraStream] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clockAction, setClockAction] = useState(null);
  const clockActionRef = useRef(null);
  const [, setCapturedFaceFile] = useState(null);
  const [, setVerificationMessage] = useState("");
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

  // Start Camera and Face Detection
  const startCamera = useCallback(async () => {
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
      startDetectionRef.current?.();
    } catch (err) {
      console.error("Camera error:", err);
      showToast("Camera access denied. No camera device found.");
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
  }, [showToast,]);

  // Stop Camera and Face Detection
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
    cameraStartedRef.current = false;
    clockActionRef.current = null;
    setCameraStream(null);
    setFaceAligned(false);
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

  startDetectionRef.current = startDetection;

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
        showToast("Clocked In Successfully!");
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
  }, [showFaceModal, loadingModels, cameraStream, startCamera, stopCamera]);

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
  const monthOptions = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: new Date(2000, index, 1).toLocaleString("en-US", {
          month: "long",
        }),
      })),
    [],
  );

  const yearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);
  }, []);

  const selectedMonthHours = React.useMemo(() => {
    const monthlyRecords = summary?.recentAttendance?.filter((record) => {
      const recordDate = new Date(record.clock_in || record.clockIn || record.date);
      if (Number.isNaN(recordDate.getTime())) return false;

      return (
        recordDate.getMonth() + 1 === selectedTargetMonth &&
        recordDate.getFullYear() === selectedTargetYear &&
        Number(record.hours_worked || 0) > 0
      );
    });

    if (monthlyRecords && monthlyRecords.length > 0) {
      return monthlyRecords.reduce(
        (total, record) => total + Number(record.hours_worked || 0),
        0,
      );
    }

    return Number(summary?.monthHours || 0);
  }, [summary?.recentAttendance, summary?.monthHours, selectedTargetMonth, selectedTargetYear]);

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
      <Row className="attendance-overview-row g-3 g-md-4">
        <Col lg={5}>
          <Card className="border-0 rounded-2 mb-3 shadow-sm overview-status-card attendance-overview-card">
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
                  <div className="attendance-overview-header">
                    <h3 className="attendance-overview-title">Today's Attendance</h3>
                    <div className={`attendance-duty-pill ${summary.isClockedIn ? "is-on-duty" : "is-off-duty"}`}>
                      <span className="attendance-duty-dot" aria-hidden="true"></span>
                      {statusText}
                    </div>
                  </div>

                  <div className="attendance-session-panel">
                    <div className="attendance-session-main">
                      <span className="attendance-label">Current Session</span>
                      <h2 className="attendance-session-time">{sessionTime}</h2>
                      <div className="attendance-session-status">
                        <span className="attendance-status-dot" aria-hidden="true"></span>
                        {summary.isClockedIn ? "Checked In" : "Not Checked In"}
                      </div>
                    </div>

                    <div className="attendance-metrics">
                      <div className="attendance-metric-tile">
                        <Clock className="attendance-metric-icon" size={29} />
                        <div>
                          <span className="attendance-label">Clock In</span>
                          <strong>{summary.clockInTime || "---"}</strong>
                        </div>
                      </div>
                      <div className="attendance-metric-tile">
                        <Clock className="attendance-metric-icon" size={29} />
                        <div>
                          <span className="attendance-label">Hours Today</span>
                          <strong>{liveHoursToday.toFixed(2)} hrs</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="attendance-action-row">
                    <Button
                      variant="success"
                      className="attendance-action-button attendance-clock-in"
                      onClick={handleClockInClick}
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
                          <Clock size={16} className="me-2" />
                          Clock In
                        </>
                      )}
                    </Button>
                    <Button
                      variant="danger"
                      className="attendance-action-button attendance-clock-out"
                      onClick={handleClockOutClick}
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

        <Col lg={7}>
          <Card className="border-0 rounded-2 shadow-sm monthly-target-card attendance-target-card mb-3 mb-md-3">
            <Card.Body className="p-3 p-md-4">
              <div className="attendance-target-header">
                <div>
                  <h3 className="attendance-target-title">Monthly Target</h3>
                  <h4 className="attendance-target-hours">{monthlyTarget} hrs</h4>
                </div>
                <div className="attendance-target-dropdown-wrap">
                  <select
                    className="attendance-target-select"
                    value={selectedTargetMonth}
                    onChange={(event) => setSelectedTargetMonth(Number(event.target.value))}
                    aria-label="Select month"
                  >
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="attendance-target-select"
                    value={selectedTargetYear}
                    onChange={(event) => setSelectedTargetYear(Number(event.target.value))}
                    aria-label="Select year"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="attendance-target-body">
                <div className="attendance-target-copy">
                  <strong>{selectedMonthHours.toFixed(2)} hrs completed</strong>
                  <span>{(monthlyTarget - selectedMonthHours).toFixed(2)} hrs remaining</span>
                  <div className="progress attendance-target-progress" style={{ height: "8px" }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{
                        width: `${Math.min((selectedMonthHours / monthlyTarget) * 100, 100)}%`,
                      }}
                      aria-valuenow={selectedMonthHours}
                      aria-valuemin="0"
                      aria-valuemax={monthlyTarget}
                    ></div>
                  </div>
                </div>
                <div
                  className="attendance-target-ring"
                  style={{
                    "--target-progress": `${Math.min(
                      (selectedMonthHours / monthlyTarget) * 100,
                      100,
                    )}%`,
                  }}
                >
                  <strong>{Math.round(Math.min((selectedMonthHours / monthlyTarget) * 100, 100))}%</strong>
                  <span>Completed</span>
                </div>
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
