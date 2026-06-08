import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Badge,
  Button,
  Table,
  Dropdown,
  Pagination,
} from "react-bootstrap";
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

  // Reset pagination when recent attendance data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [summary?.recentAttendance?.length]);

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
          <Card className="border-0 rounded-4 mb-3 shadow-sm overview-status-card">
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
                      onClick={handleClockIn}
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
                      onClick={() => setShowReportModal(true)}
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
              <Card className="border-0 rounded-4 shadow-sm stat-info-card">
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
              <Card className="border-0 rounded-4 shadow-sm stat-info-card">
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
              <Card className="border-0 rounded-4 shadow-sm stat-info-card">
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
          <Card className="border-0 rounded-4 shadow-sm monthly-target-card">
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

      {!loadingSummary && summary.recentAttendance.length > 0 && (
        <Card className="border-0 shadow-sm rounded-4 mb-4">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h4 className="fw-bold mb-1">Recent Attendance</h4>
                <p className="text-muted mb-0">
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

            <div className="table-responsive">
              <Table hover borderless striped className="align-middle mb-0">
                <thead className="bg-light">
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
                    <tr key={record.id || index}>
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
                          className="px-3"
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
