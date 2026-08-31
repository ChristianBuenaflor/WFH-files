import React, {
  Suspense,
  lazy,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
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
import "./Dashboard.css";
import "@/assets/style/global.css";

const RecentReport = lazy(() => import("@/pages/dashboard/components/RecentReport"));
const RecentPayslip = lazy(() => import("@/pages/dashboard/components/RecentPayslip"));
const Overview = lazy(() => import("@/pages/dashboard/components/Overview"));
const AttendanceOverview = lazy(() => import("@/pages/dashboard/components/AttendanceOverview"));

const LoadingPanel = () => (
  <div className="text-center py-4 text-muted">
    <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
    Loading...
  </div>
);

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
  const [recentPayslips, setRecentPayslips] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

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
        setRecentReports(recent_reports || []);
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

  const formatPeso = (value) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(value);

  return (
    <AdminLayout setIsAuth={setIsAuth}>
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
                  <Card className="stat-card-modern">
                    <Card.Body className="stat-content p-0">
                      <div className="stat-info">
                        <div className="d-flex align-items-center justify-content-start">
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
                      <div className={`stat-icon stat-icon-${stat.color}`}>
                        {iconMap[stat.icon]}
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
