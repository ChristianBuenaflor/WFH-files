import React, {
  Suspense,
  lazy,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Container, Row, Col, Card, Modal } from "react-bootstrap";
import AdminLayout from "@/components/layout/Adminlayout";
import {
  PersonFillCheck,
  FileEarmarkRuledFill,
  ClipboardDataFill,
  CashCoin,
  Eye,
  EyeSlash,
} from "react-bootstrap-icons";
import api from "@/config/axios";
import { useAuth } from "@/context/AuthContext.jsx";
import "./Dashboard.css";
import "@/assets/style/global.css";

const RecentReport = lazy(() => import("@/pages/dashboard/components/RecentReport"));
const RecentPayslip = lazy(() => import("@/pages/dashboard/components/RecentPayslip"));
const Overview = lazy(() => import("@/pages/dashboard/components/Overview"));
const AttendanceOverview = lazy(() => import("@/pages/dashboard/components/AttendanceOverview"));

const getStatTrendPoints = (stat) => {
  const numericValue = Number(String(stat.value).replace(/[^0-9.-]/g, "")) || 0;
  const valueScale = Math.min(Math.log10(numericValue + 1) / 5, 1);
  const endPoint = 28 - valueScale * 20;
  const variation = (numericValue % 7) * 0.8;

  return `2,30 16,${25 - variation} 29,${28 - valueScale * 5} 43,${18 + variation} 57,${22 - valueScale * 8} 71,${endPoint + 5} 86,${endPoint}`;
};

const getStatTrendAreaPoints = (stat) =>
  `2,42 ${getStatTrendPoints(stat)} 86,42`;

const getStatTrendColor = (stat) => {
  const colors = {
    1: "#2475db",
    2: "#159b67",
    3: "#8745dd",
    4: "#eba900",
  };

  return colors[stat.id] || colors[1];
};

const LoadingPanel = () => (
  <div className="text-center py-4 text-muted">
    <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
    Loading...
  </div>
);

const formatPeso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);

// Memoize child components to prevent unnecessary re-renders
const MemoizedRecentReport = React.memo(({ recentReports }) => (
  <Suspense fallback={<LoadingPanel />}>
    <RecentReport recentReports={recentReports} />
  </Suspense>
));
const MemoizedRecentPayslip = React.memo(({ recentPayslips }) => (
  <Suspense fallback={<LoadingPanel />}>
    <RecentPayslip recentPayslips={recentPayslips} />
  </Suspense>
));
const MemoizedOverview = React.memo(({ selectedMonth, selectedYear }) => (
  <Suspense fallback={<LoadingPanel />}>
    <Overview selectedMonth={selectedMonth} selectedYear={selectedYear} />
  </Suspense>
));
const MemoizedAttendanceOverview = React.memo(() => (
  <Suspense fallback={<LoadingPanel />}>
    <AttendanceOverview />
  </Suspense>
));

const Dashboard = ({ setIsAuth }) => {
  const { user } = useAuth();
  const [hidePayValues, setHidePayValues] = useState({
    grossPay: true,
    netPay: true,
  });

  const togglePayVisibility = useCallback((payType) => {
    setHidePayValues((prev) => ({
      ...prev,
      [payType]: !prev[payType],
    }));
  }, []);

  const iconMap = useMemo(
    () => ({
      "person-fill-check": <PersonFillCheck />,
      "file-earmark-ruled-fill": <FileEarmarkRuledFill />,
      "clipboard-data-fill": <ClipboardDataFill />,
      "cash-coin": <CashCoin />,
    }),
    [],
  );

  const [stats, setStats] = useState([
    {
      id: 1,
      label: "Total Attendances",
      value: "0",
      icon: "person-fill-check",
      color: "primary",
    },
    {
      id: 2,
      label: "Total Payslips",
      value: "0",
      icon: "file-earmark-ruled-fill",
      color: "primary",
    },
    {
      id: 3,
      label: "Total Gross Pay",
      value: "0",
      icon: "clipboard-data-fill",
      color: "primary",
    },
    {
      id: 4,
      label: "Total Net Pay",
      value: "0",
      icon: "cash-coin",
      color: "primary",
    },
  ]);

  const [announcements, setAnnouncements] = useState([]);
  const [dismissedAnnouncementKey, setDismissedAnnouncementKey] = useState(null);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [recentPayslips, setRecentPayslips] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  const userKey = user?.id || user?.email || user?.username;
  const unreadAnnouncements = announcements
    .filter((announcement) => !announcement.is_seen)
    .sort(
      (first, second) =>
        new Date(second.created_at) - new Date(first.created_at),
    );
  const latestUnreadAnnouncement = unreadAnnouncements[0];
  const selectedAnnouncement =
    announcements.find(
      (announcement) => announcement.id === selectedAnnouncementId,
    ) || latestUnreadAnnouncement || announcements[0];
  const announcementStorageKey =
    userKey && latestUnreadAnnouncement?.id
      ? `dashboard-announcement-${userKey}-${latestUnreadAnnouncement.id}`
      : null;

  useEffect(() => {
    if (!announcementStorageKey) return;

    const alreadySeen = localStorage.getItem(announcementStorageKey);
    const shouldOpen =
      announcementStorageKey !== dismissedAnnouncementKey && !alreadySeen;

    if (shouldOpen) {
      localStorage.setItem(announcementStorageKey, "shown");
      const openModalTask = window.setTimeout(() => {
        setShowAnnouncementModal(true);
      }, 0);

      return () => window.clearTimeout(openModalTask);
    }
  }, [announcementStorageKey, dismissedAnnouncementKey]);

  useEffect(() => {
    const handleAnnouncementSeen = (event) => {
      const announcementId = event.detail?.announcementId;
      if (!announcementId) return;

      setAnnouncements((prev) =>
        prev.map((announcement) =>
          announcement.id === announcementId
            ? { ...announcement, is_seen: true }
            : announcement,
        ),
      );
    };

    window.addEventListener("announcement-seen", handleAnnouncementSeen);
    return () => window.removeEventListener("announcement-seen", handleAnnouncementSeen);
  }, []);

  const handleAnnouncementClose = () => {
    setShowAnnouncementModal(false);
    if (announcementStorageKey) {
      setDismissedAnnouncementKey(announcementStorageKey);
    }
  };

  const handleAnnouncementSelect = async (announcementId) => {
    setSelectedAnnouncementId(announcementId);

    const announcement = announcements.find((item) => item.id === announcementId);
    if (!announcement || announcement.is_seen) return;

    try {
      await api.get(`/announcements/${announcementId}`);
      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === announcementId ? { ...item, is_seen: true } : item,
        ),
      );
      window.dispatchEvent(
        new CustomEvent("announcement-seen", {
          detail: { announcementId },
        }),
      );
    } catch (err) {
      console.error("Error marking announcement as read:", err);
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get("/dashboard/employees");
        const { overview, announcements, recent_payslips, recent_reports } =
          res.data;

        // --- STAT CARDS ---
        setStats([
          {
            id: 1,
            label: "Total Attendances",
            value: overview.total_attendance.toLocaleString(),
            icon: "person-fill-check",
            color: "primary",
          },
          {
            id: 2,
            label: "Total Payslips",
            value: overview.total_payslip_count.toLocaleString(),
            icon: "file-earmark-ruled-fill",
            color: "primary",
          },
          {
            id: 3,
            label: "Total Gross Pay",
            value: formatPeso(overview.total_gross_pay),
            icon: "clipboard-data-fill",
            color: "primary",
          },
          {
            id: 4,
            label: "Total Net Pay",
            value: formatPeso(overview.total_net_pay),
            icon: "cash-coin",
            color: "primary",
          },
        ]);

        setAnnouncements(announcements);
        setRecentPayslips(recent_payslips || []);
        setRecentReports((recent_reports || []).slice(0, 5));
        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
        setError("Failed to load dashboard");
        setLoading(false);
      }
    };

    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchDashboard();
  }, []);

  return (
    <AdminLayout setIsAuth={setIsAuth}>
      <Modal
        show={showAnnouncementModal}
        onHide={handleAnnouncementClose}
        centered
        size="lg"
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Announcement</Modal.Title>
        </Modal.Header>
        <Modal.Body className="announcement-popup-body p-0">
          <div className="announcement-popup-list">
            {announcements.map((announcement) => (
              <button
                type="button"
                key={announcement.id}
                className={`announcement-popup-list-item ${
                  selectedAnnouncement?.id === announcement.id
                    ? "active"
                    : ""
                }`}
                onClick={() => handleAnnouncementSelect(announcement.id)}
              >
                <span className="announcement-popup-list-heading">
                  <strong>{announcement.title}</strong>
                  <span
                    className={`announcement-status-dot ${announcement.is_seen ? "is-seen" : ""}`}
                    aria-label={announcement.is_seen ? "Read announcement" : "Unread announcement"}
                    title={announcement.is_seen ? "Read announcement" : "Unread announcement"}
                  >
                    <span aria-hidden="true" />
                  </span>
                </span>
                <small>{new Date(announcement.created_at).toLocaleDateString()}</small>
              </button>
            ))}
          </div>
          <div className="announcement-popup-detail announcement-details">
            <h5 className="announcement-title">{selectedAnnouncement?.title}</h5>
            {selectedAnnouncement?.created_at && (
              <p className="text-muted announcement-date">
                Posted on: {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
              </p>
            )}
            <hr />
            <div
              className="announcement-content mb-0"
              dangerouslySetInnerHTML={{
                __html: selectedAnnouncement?.content || "",
              }}
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <button
            type="button"
            className="btn btn-primary btn-sm px-3"
            onClick={handleAnnouncementClose}
          >
            Close
          </button>
        </Modal.Footer>
      </Modal>
      <Container fluid className="glb-container">
        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="loadingScreen">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading dashboard...</span>
            </div>
            <p>Loading dashboard information...</p>
          </div>
        ) : (
          <>
            <Row>
              <Col>
                <h2 className="dashboard-title">Dashboard</h2>
                <p className="dashboard-subtitle">
                  Welcome back! Here's your HRIS overview
                </p>
              </Col>
            </Row>

            {/* STAT CARDS */}
            <Row className="mb-3 g-4 d-none d-md-flex">
              {stats.map((stat) => (
                <Col md={3} key={stat.id}>
                  <Card className={`stat-card-modern stat-card-${stat.id}`}>
                    <Card.Body className="stat-content p-0">
                      <div className={`stat-icon stat-icon-${stat.color}`}>
                        {iconMap[stat.icon]}
                      </div>
                      <div className="stat-info">
                        <div className="stat-label-row">
                          <p>{stat.label}</p>
                          <span>
                            {(stat.id === 3 || stat.id === 4) && (
                              <button
                                className="eye-toggle-btn mb-2 ms-2"
                                onClick={() =>
                                  togglePayVisibility(
                                    stat.id === 3 ? "grossPay" : "netPay",
                                  )
                                }
                                title={
                                  stat.id === 3
                                    ? hidePayValues.grossPay
                                      ? "Show gross pay"
                                      : "Hide gross pay"
                                    : hidePayValues.netPay
                                      ? "Show net pay"
                                      : "Hide net pay"
                                }
                              >
                                {stat.id === 3 ? (
                                  hidePayValues.grossPay ? (
                                    <EyeSlash />
                                  ) : (
                                    <Eye />
                                  )
                                ) : hidePayValues.netPay ? (
                                  <EyeSlash />
                                ) : (
                                  <Eye />
                                )}
                              </button>
                            )}
                          </span>
                        </div>
                        <div className="stat-value-container">
                          <h5>
                            {(stat.id === 3 && hidePayValues.grossPay) ||
                            (stat.id === 4 && hidePayValues.netPay)
                              ? "••••••"
                              : stat.value}
                          </h5>
                        </div>
                      </div>
                      <div className={`stat-trend-chart stat-trend-${stat.id}`} aria-hidden="true">
                        <svg viewBox="0 0 88 42" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={`stat-gradient-${stat.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={getStatTrendColor(stat)} stopOpacity="0.22" />
                              <stop offset="100%" stopColor={getStatTrendColor(stat)} stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <line className="stat-trend-baseline" x1="2" y1="41" x2="86" y2="41" />
                          <polygon
                            className="stat-trend-area"
                            points={getStatTrendAreaPoints(stat)}
                            fill={`url(#stat-gradient-${stat.id})`}
                          />
                          <polyline points={getStatTrendPoints(stat)} />
                          <circle className="stat-trend-endpoint" cx="86" cy={getStatTrendPoints(stat).split(" ").at(-1).split(",")[1]} r="2.5" />
                        </svg>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* ATTENDANCE OVERVIEW */}
            <Row className="mb-4">
              <Col>
                <MemoizedAttendanceOverview />
              </Col>
            </Row>

            {/* ATTENDANCE OVERVIEW */}
            <Row className="mb-4">
              <Col>
                <MemoizedOverview />
              </Col>
            </Row>

            {/* RECENT REPORTS */}
            <Row className="mb-4">
              <Col>
                <MemoizedRecentReport recentReports={recentReports} />
              </Col>
            </Row>

            {/* RECENT PAYSLIPS */}
            <Row>
              <Col>
                <MemoizedRecentPayslip recentPayslips={recentPayslips} />
              </Col>
            </Row>
          </>
        )}
      </Container>
    </AdminLayout>
  );
};

export default Dashboard;
