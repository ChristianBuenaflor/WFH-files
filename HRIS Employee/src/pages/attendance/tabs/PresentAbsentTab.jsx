import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Badge,
  Form,
  Button,
  OverlayTrigger,
  Pagination,
} from "react-bootstrap";
import {
  CalendarDate,
  ClockHistory,
  PersonBadge,
  QuestionCircle,
  Clock,
  DoorOpen,
  ChevronLeft,
  ChevronRight,
} from "react-bootstrap-icons";

const PresentAbsentTab = ({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  filteredAttendance,
  absentDates,
  loadingPresentAbsent,
  formatTime,
  formatHours,
  setShowForgotModal,
  setForgotClockInForm,
  popover,
}) => {
  const ROWS_PER_PAGE = 10;
  const [currentPresentPage, setCurrentPresentPage] = useState(1);
  const [currentAbsentPage, setCurrentAbsentPage] = useState(1);

  // Filter states for present table
  const [statusFilter, setStatusFilter] = useState("all");
  const [minHoursFilter, setMinHoursFilter] = useState("");
  const [searchDate, setSearchDate] = useState("");

  // Reset pagination when month/year changes
  useEffect(() => {
    setCurrentPresentPage(1);
    setCurrentAbsentPage(1);
  }, [selectedMonth, selectedYear]);

  // Reset present pagination when filters change
  useEffect(() => {
    setCurrentPresentPage(1);
  }, [statusFilter, minHoursFilter, searchDate]);

  // Apply filters to attendance data
  const getFilteredPresentData = () => {
    let filtered = filteredAttendance;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => {
        if (statusFilter === "on-duty") {
          return record.clock_out === null;
        }
        return record.status === statusFilter;
      });
    }

    // Filter by minimum hours
    if (minHoursFilter) {
      const minHours = parseFloat(minHoursFilter);
      filtered = filtered.filter(
        (record) => parseFloat(record.hours_worked) >= minHours
      );
    }

    // Filter by date search
    if (searchDate) {
      const searchDateObj = new Date(searchDate);
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.clock_in);
        return (
          recordDate.toLocaleDateString() ===
          searchDateObj.toLocaleDateString()
        );
      });
    }

    return filtered;
  };

  const filteredPresentData = getFilteredPresentData();

  // Calculate paginated present data
  const presentStartIndex = (currentPresentPage - 1) * ROWS_PER_PAGE;
  const presentEndIndex = presentStartIndex + ROWS_PER_PAGE;
  const paginatedPresent = filteredPresentData.slice(
    presentStartIndex,
    presentEndIndex,
  );
  const totalPresentPages = Math.ceil(
    filteredPresentData.length / ROWS_PER_PAGE,
  );

  // Calculate paginated absent data
  const absentStartIndex = (currentAbsentPage - 1) * ROWS_PER_PAGE;
  const absentEndIndex = absentStartIndex + ROWS_PER_PAGE;
  const paginatedAbsent = absentDates.slice(absentStartIndex, absentEndIndex);
  const totalAbsentPages = Math.ceil(absentDates.length / ROWS_PER_PAGE);

  // Pagination component renderer
  const PaginationControls = ({ currentPage, setCurrentPage, totalPages }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
        <div className="text-muted small">
          Page {currentPage} of {totalPages}
        </div>
        <div className="pagination-controls">
          <Button
            variant="outline-secondary"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="me-2"
          >
            <ChevronLeft size={16} /> Previous
          </Button>

          <div className="d-inline-flex gap-1">
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
            className="ms-2"
          >
            Next <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    );
  };
  return (
    <div className="present-absent-wrapper">
      {/* FILTER SECTION */}
      <Card className="border-0 shadow-sm rounded-2 mb-4 bg-gradient">
        <Card.Body className="p-4">
          <Row className="align-items-end g-3">
            <Col xs={12} md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold text-muted small text-uppercase">
                  <CalendarDate className="me-1" /> Month
                </Form.Label>

                <Form.Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="rounded-3 border-0 shadow-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleString("default", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold text-muted small text-uppercase">
                  <ClockHistory className="me-1" /> Year
                </Form.Label>

                <Form.Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="rounded-3 border-0 shadow-sm"
                >
                  {Array.from(
                    { length: 5 },
                    (_, i) => new Date().getFullYear() - 2 + i,
                  ).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={6} className="d-flex justify-content-md-end">
              <div className="d-flex align-items-center">
                <OverlayTrigger
                  trigger={["hover", "focus"]}
                  placement="left"
                  overlay={popover}
                >
                  <span className="d-inline-flex">
                    <QuestionCircle
                      className="text-muted me-2"
                      size={18}
                      style={{ cursor: "pointer" }}
                    />
                  </span>
                </OverlayTrigger>

                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-3 px-3 shadow-sm"
                  onClick={() => {
                    setForgotClockInForm({
                      adjustedClockDate: "",
                      adjustedClockIn: "",
                      adjustedClockOut: "",
                      reason: "",
                    });
                    setShowForgotModal(true);
                  }}
                >
                  Request Clock In
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* SUMMARY STATS */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm rounded-2 text-center">
            <Card.Body className="py-3">
              <h6 className="text-muted small text-uppercase">Month</h6>
              <h5 className="fw-bold mb-0">
                {new Date(2000, selectedMonth - 1, 1).toLocaleString(
                  "default",
                  { month: "short" },
                )}{" "}
                {selectedYear}
              </h5>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm rounded-2 text-center">
            <Card.Body className="py-3">
              <h6 className="text-muted small text-uppercase">Present</h6>
              <h5 className="fw-bold mb-0">{filteredPresentData.length} days</h5>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm rounded-2 text-center">
            <Card.Body className="py-3">
              <h6 className="text-muted small text-uppercase">Absent</h6>
              <h5 className="fw-bold mb-0">{absentDates.length} days</h5>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm rounded-2 text-center">
            <Card.Body className="py-3">
              <h6 className="text-muted small text-uppercase">Total</h6>
              <h5 className="fw-bold mb-0">
                {filteredPresentData.length + absentDates.length} days
              </h5>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* PRESENT TABLE */}
      <Row className="g-4">
        {/* PRESENT TABLE FILTERS */}
        <Col xs={12}>
          <Card className="border-0 shadow-sm rounded-2 bg-light">
            <Card.Body className="p-3">
              <h6 className="fw-semibold mb-3">Filter Present Days</h6>
              <Row className="g-3">
                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase mb-2">
                      Status
                    </Form.Label>
                    <Form.Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-3 border-0 shadow-sm"
                      size="sm"
                    >
                      <option value="all">All Status</option>
                      <option value="Present">Present</option>
                      <option value="Missed">Missed</option>
                      <option value="on-duty">On Duty</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase mb-2">
                      Minimum Hours
                    </Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="e.g., 8"
                      value={minHoursFilter}
                      onChange={(e) => setMinHoursFilter(e.target.value)}
                      className="rounded-3 border-0 shadow-sm"
                      step="0.5"
                      min="0"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase mb-2">
                      Search Date
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className="rounded-3 border-0 shadow-sm"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3} className="d-flex align-items-end">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="w-100 rounded-3"
                    onClick={() => {
                      setStatusFilter("all");
                      setMinHoursFilter("");
                      setSearchDate("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12}>
          <Card className="border-0 shadow-sm rounded-2">
            <Card.Header className="bg-white border-0 pt-4 pb-0 px-4">
              <h5 className="fw-bold mb-0">Present Days</h5>
            </Card.Header>

            <Card.Body className="p-4">
              {loadingPresentAbsent ? (
                <div className="text-center py-5">
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                </div>
              ) : filteredPresentData.length > 0 ? (
                <>
                  <div className="mb-3 d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      Showing {paginatedPresent.length} of {filteredPresentData.length} records
                    </small>
                  </div>
                  <div className="table-responsive">
                    <Table
                      borderless
                      hover
                      striped
                      className="align-middle mb-0"
                    >
                      <thead className="text-muted small">
                        <tr>
                          <th>Date</th>
                          <th>Clock In</th>
                          <th>Clock Out</th>
                          <th>Hours</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedPresent.map((record, idx) => (
                          <tr key={record.id || idx}>
                            <td className="fw-medium">
                              {new Date(record.clock_in).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </td>

                            <td>
                              <Clock size={14} className="text-muted me-1" />
                              {formatTime(record.clock_in)}
                            </td>

                            <td>
                              {record.clock_out ? (
                                <>
                                  <DoorOpen
                                    size={14}
                                    className="text-muted me-1"
                                  />
                                  {formatTime(record.clock_out)}
                                </>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td>{formatHours(record.hours_worked)}h</td>

                            <td>
                              {record.clock_out === null && (
                                <Badge bg="secondary" className="px-3 py-2">
                                  On Duty
                                </Badge>
                              )}

                              {record.clock_out !== null && (
                                <Badge
                                  bg={
                                    record.status === "Present"
                                      ? "success"
                                      : record.status === "Missed"
                                        ? "info"
                                        : "danger"
                                  }
                                  className="px-3 py-2"
                                >
                                  {record.status}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  <PaginationControls
                    currentPage={currentPresentPage}
                    setCurrentPage={setCurrentPresentPage}
                    totalPages={totalPresentPages}
                  />
                </>
              ) : filteredAttendance.length > 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>No records match the selected filters</p>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => {
                      setStatusFilter("all");
                      setMinHoursFilter("");
                      setSearchDate("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  No present records for this month
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* ABSENT TABLE */}
        <Col xs={12}>
          <Card className="border-0 shadow-sm rounded-2">
            <Card.Header className="bg-white border-0 pt-4 pb-0 px-4">
              <h5 className="fw-bold mb-0">Absent Days</h5>
            </Card.Header>

            <Card.Body className="p-4">
              {loadingPresentAbsent ? (
                <div className="text-center py-5">
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                </div>
              ) : absentDates.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <Table borderless hover className="align-middle mb-0">
                      <thead className="text-muted small">
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedAbsent.map((date, idx) => (
                          <tr key={idx}>
                            <td className="fw-medium">
                              {new Date(date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>

                            <td>
                              <Badge bg="danger" className="px-3 py-2">
                                Absent
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  <PaginationControls
                    currentPage={currentAbsentPage}
                    setCurrentPage={setCurrentAbsentPage}
                    totalPages={totalAbsentPages}
                  />
                </>
              ) : (
                <div className="text-center py-5 text-muted">
                  No absences for this month 🎉
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default React.memo(PresentAbsentTab);
