import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Badge,
  Button,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import {
  Clock,
  DoorOpen,
  Calendar,
  Shield,
  CheckCircle,
  BoxArrowInDownRight,
  BoxArrowInRight,
  GraphUpArrow,
  BoxArrowLeft,
} from "react-bootstrap-icons";
import "@/assets/style/global.css";
import api from "@/config/axios";
import ReportClockOutModal from "@/pages/attendance/components/modals/ReportClockOutModal.jsx";

const AttendanceOverview = () => {
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
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [sessionTime, setSessionTime] = useState("00:00:00");
  const [showReportModal, setShowReportModal] = useState(false);
  const [ccEmails, setCcEmails] = useState("");
  const [reportSubject, setReportSubject] = useState("");
  const [reportBody, setReportBody] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState(160);
  const [weekTrend, setWeekTrend] = useState(0);
  const [isOnTrack, setIsOnTrack] = useState(true);
  const [lastWeekHours, setLastWeekHours] = useState(0);

  // Toast notification function
  const showToast = (message, variant = "success") => {
    const id = Date.now();
    const toast = { id, message, variant };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Update session time every second when clocked in
  useEffect(() => {
    if (!summary.isClockedIn || !clockInTimestamp) {
      setSessionTime("00:00:00");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      setCurrentDateTime(now);
      const clockInDate = new Date(clockInTimestamp);
      const diffMs = now - clockInDate;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setSessionTime(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [summary.isClockedIn, clockInTimestamp]);

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  // Calculate attendance percentage from API data
  const fetchMyAttendance = async () => {
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

        // Calculate week trend
        const trend = thisWeekHours - lastWeek;
        setWeekTrend(trend);
        setLastWeekHours(lastWeek);

        // Calculate if on track for monthly target
        const today = new Date();
        const currentDay = today.getDate();
        const lastDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        ).getDate();
        const expectedProgress = (currentDay / lastDayOfMonth) * monthlyTarget;
        const onTrack = thisMonthHours >= expectedProgress * 0.95; // 95% threshold for on track
        setIsOnTrack(onTrack);

        // Calculate attendance percentage - same logic as Overview.jsx
        let presentPercentage = 0;
        let present = data.present || 0;
        let missed = data.missed || 0;
        let absent = data.absent || 0;
        const total = present + missed + absent;

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
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      showToast("Failed to load attendance data", "danger");
    } finally {
      setLoadingSummary(false);
    }
  };

  // Clock In Handler
  const handleClockIn = async () => {
    setLoadingIn(true);
    try {
      await api.post("/attendance/clock-in");
      showToast("Clocked In Successfully!");
      await fetchMyAttendance();
    } catch (error) {
      showToast(error.response?.data?.message || "Clock in failed", "danger");
    } finally {
      setLoadingIn(false);
    }
  };

  // Clock Out Handler (opens modal)
  const handleClockOut = () => {
    setShowReportModal(true);
  };

  // Report Submit Handler (clock out with report)
  const handleReportSubmit = async () => {
    setLoadingOut(true);
    try {
      const payload = {
        report_today: reportBody,
        cc_emails: ccEmails,
        subject: reportSubject,
      };

      await api.post("/attendance/clock-out", payload);
      showToast("Clocked Out Successfully!");

      // Clear form fields
      setCcEmails("");
      setReportSubject("");
      setReportBody("");
      setShowReportModal(false);

      // Refresh attendance data
      await fetchMyAttendance();
    } catch (error) {
      showToast(error.response?.data?.message || "Clock out failed", "danger");
    } finally {
      setLoadingOut(false);
    }
  };

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
          {/* Status Card */}
          <Card className="border-0 rounded-4 mb-3 shadow-sm overview-status-card\">
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
          <Card className="border-0 rounded-4 shadow-sm monthly-target-card mb-3 mb-md-3">
            <Card.Body className="p-3 p-md-4">
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
                      100,
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
              <Card className="border-0 rounded-4 shadow-sm stat-info-card">
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
              <Card className="border-0 rounded-4 shadow-sm stat-info-card">
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
              <Card className="border-0 rounded-4 shadow-sm stat-info-card">
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

      {/* Report Clock Out Modal */}
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
      />
    </>
  );
};

export default AttendanceOverview;
