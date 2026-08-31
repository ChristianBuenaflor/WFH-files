import React, { useState, useEffect, useRef } from "react";
import { Card, Button } from "react-bootstrap";
import {
  ChevronLeft,
  ChevronRight,
  Grid3x3Gap,
  List,
} from "react-bootstrap-icons";
import api from "@/config/axios";
import "@/pages/dashboard/components/AttendanceCalendar.css";

const AttendanceCalendar = ({ onMonthChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  const hasFetched = useRef({});
  const cachedData = useRef({});

  /*
  |--------------------------------------------------------------------------
  | Fetch Attendance
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const fetchAttendance = async () => {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const cacheKey = `${year}-${month}`;

      if (cachedData.current[cacheKey]) {
        const cached = cachedData.current[cacheKey];
        setCalendarData(cached.calendar);
        setSummary(cached.summary);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await api.get("/dashboard/calendar", {
          params: { month, year },
        });

        if (res.data.success) {
          const calendar = res.data.calendar || [];
          const summaryData = res.data.summary || {};

          setCalendarData(calendar);
          setSummary(summaryData);

          cachedData.current[cacheKey] = {
            calendar,
            summary: summaryData,
          };

          hasFetched.current[cacheKey] = true;
        } else {
          setError(res.data.message || "Failed to load attendance");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load attendance");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [currentDate]);

  /*
  |--------------------------------------------------------------------------
  | Calendar Helpers
  |--------------------------------------------------------------------------
  */

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getCalendarRecord = (day) => {
    if (!day) return null;

    const dateStr = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return calendarData.find((item) => item.date === dateStr) || null;
  };

  const getDateFromRecord = (record) => {
    const [year, month, day] = record.date.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const getAttendanceStatus = (day) => {
    const record = getCalendarRecord(day);

    return record?.status?.toLowerCase() || null;
  };

  /*
  |--------------------------------------------------------------------------
  | Calendar Build
  |--------------------------------------------------------------------------
  */

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const days = [];
  const weeks = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  /*
  |--------------------------------------------------------------------------
  | Navigation
  |--------------------------------------------------------------------------
  */

  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    setCurrentDate(newDate);

    // ✅ Notify parent component about month change
    if (onMonthChange) {
      onMonthChange(newDate.getMonth() + 1, newDate.getFullYear());
    }
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    setCurrentDate(newDate);

    // ✅ Notify parent component about month change
    if (onMonthChange) {
      onMonthChange(newDate.getMonth() + 1, newDate.getFullYear());
    }
  };

  const handleToday = () => {
    const newDate = new Date();
    setCurrentDate(newDate);

    // ✅ Notify parent component about month change
    if (onMonthChange) {
      onMonthChange(newDate.getMonth() + 1, newDate.getFullYear());
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Status Helpers
  |--------------------------------------------------------------------------
  */

  const getStatusClass = (day) => {
    if (!day) return "";

    const status = getAttendanceStatus(day);

    if (!status) return "no-data";

    if (status === "missed") return "no-data";

    // Build the date object for this day
    const dayDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0); // remove time for accurate comparison

    if (status.toLowerCase() === "absent") {
      if (dayDate < today) return "absent"; // past absent -> red
      if (dayDate.getTime() === today.getTime()) return "absent-today"; // today absent -> red or special
      return "absent-future"; // future absent -> gray
    }

    return status.toLowerCase(); // other statuses stay the same
  };

  const getRecordStatusClass = (record) => {
    if (!record?.status || record.status.toLowerCase() === "missed") {
      return "no-data";
    }

    const status = record.status.toLowerCase();
    if (status !== "absent") return status;

    const recordDate = getDateFromRecord(record);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (recordDate < todayDate) return "absent";
    if (recordDate.getTime() === todayDate.getTime()) return "absent-today";
    return "absent-future";
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getStatusLabel = (day) => {
    if (!day) return "";

    const status = getAttendanceStatus(day);

    const map = {
      present: "Present",
      weekend: "Weekend",
      absent: "Absent",
      late: "Late",
      leave: "Leave",
    };

    if (status === "holiday") {
      const holiday = getCalendarRecord(day)?.holiday;
      return holiday?.name ? `Holiday: ${holiday.name}` : "Holiday";
    }

    return map[status] || (status === "missed" ? "" : status);
  };

  const getCalendarDateLabel = (day) => {
    if (!day) return "";

    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusIndicator = (day) => {
    const status = getAttendanceStatus(day);

    const icons = {
       present: "✓",
      weekend: "-",
      absent: "✗",
      late: "!",
      holiday: "H",
    };

    return icons[status] || "";
  };

  const getRecordStatusLabel = (record) => {
    if (!record?.status || record.status.toLowerCase() === "missed") {
      return "No attendance record";
    }

    if (record.status.toLowerCase() === "holiday" && record.holiday?.name) {
      return `Holiday: ${record.holiday.name}`;
    }

    return record.status.charAt(0).toUpperCase() + record.status.slice(1);
  };

  const formatRecordDate = (dateString) =>
    getDateFromRecord({ date: dateString }).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <Card className="attendance-calendar-card h-100">
      <Card.Header className="card-header-custom">
        <div className="calendar-header">
          <h5 className="mb-0">Attendance Calendar</h5>

          <div className="calendar-controls">
                <div className="calendar-view-toggle" aria-label="Calendar view">
                  <button
                    type="button"
                    className={`view-toggle-button ${viewMode === "grid" ? "active" : ""}`}
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                    aria-pressed={viewMode === "grid"}
                    title="Grid view"
                  >
                    <Grid3x3Gap />
                  </button>
                  <button
                    type="button"
                    className={`view-toggle-button ${viewMode === "list" ? "active" : ""}`}
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                    aria-pressed={viewMode === "list"}
                    title="List view"
                  >
                    <List />
                  </button>
                </div>
            <Button
              variant="sm"
              size="sm"
              onClick={handlePreviousMonth}
              className="btn-icon"
            >
              <ChevronLeft />
            </Button>

            <span className="month-year">{monthName}</span>

            <Button
              variant="sm"
              size="sm"
              onClick={handleNextMonth}
              className="btn-icon"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Body className=" mb-4">
        {error && <div className="alert alert-danger">{error}</div>}

        {/* SUMMARY */}

        {/* <Row className="mb-3 summary-stats">
          <Col xs={6} sm={3} className="mb-2">
            <div className="stat-box present">
              <div className="stat-number">{summary.present}</div>
              <div className="stat-label">Present</div>
            </div>
          </Col>

          <Col xs={6} sm={3} className="mb-2">
            <div className="stat-box late">
              <div className="stat-number">{summary.late}</div>
              <div className="stat-label">Late</div>
            </div>
          </Col>

          <Col xs={6} sm={3} className="mb-2">
            <div className="stat-box absent">
              <div className="stat-number">{pastAbsentCount}</div>
              <div className="stat-label">Absent</div>
            </div>
          </Col>
        </Row> */}

        {loading && (
          <div className="text-center text-muted py-4">Loading calendar...</div>
        )}

        {!loading && (
          <>
            {viewMode === "grid" ? (
              <div className="calendar-container">
                <div className="calendar-grid">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div key={day} className="weekday-header">
                        {day}
                      </div>
                    ),
                  )}

                  {weeks.map((week, weekIndex) =>
                    week.map((day, dayIndex) => (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`calendar-day ${getStatusClass(day)}`}
                        tabIndex={day ? 0 : undefined}
                      >
                        {day && (
                          <>
                            <div className="day-content">
                              <span className="day-number">{day}</span>

                              {getStatusIndicator(day) && (
                                <span className="status-indicator">
                                  {getStatusIndicator(day)}
                                </span>
                              )}
                            </div>

                            <div className="calendar-tooltip" role="tooltip">
                              <div className="calendar-tooltip-date">
                                {getCalendarDateLabel(day)}
                              </div>
                              <div className="calendar-tooltip-status">
                                <span className="calendar-tooltip-dot" />
                                {getStatusLabel(day) || "No attendance record"}
                              </div>
                              {getCalendarRecord(day)?.holiday && (
                                <div className="calendar-tooltip-holiday">
                                  <strong>
                                    {getCalendarRecord(day).holiday.name}
                                  </strong>
                                  {getCalendarRecord(day).holiday.type && (
                                    <span>
                                      {getCalendarRecord(day).holiday.type}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )),
                  )}
                </div>
              </div>
            ) : (
              <div className="calendar-list" role="list">
                {calendarData.map((record) => (
                  <div
                    key={record.date}
                    className={`calendar-list-item ${getRecordStatusClass(record)}`}
                    role="listitem"
                  >
                    <div className="calendar-list-date">
                      <span className="calendar-list-day">
                        {getDateFromRecord(record).getDate()}
                      </span>
                      <span>{formatRecordDate(record.date)}</span>
                    </div>
                    <div className="calendar-list-status">
                      <span className="calendar-list-status-dot" />
                      <span>{getRecordStatusLabel(record)}</span>
                    </div>
                    {record.holiday && (
                      <div className="calendar-list-holiday">
                        <strong>{record.holiday.name}</strong>
                        {record.holiday.type && <span>{record.holiday.type}</span>}
                      </div>
                    )}
                    {record.clock_in && (
                      <div className="calendar-list-time">
                        {new Date(record.clock_in).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* LEGEND */}

            <div className="calendar-legend mt-4">
              <div className="legend-item">
                <span className="legend-color present"></span>
                <span className="legend-text">Present</span>
              </div>
              
              <div className="legend-item">
                <span className="legend-color late"></span>
                <span className="legend-text">Late</span>
              </div>

              <div className="legend-item">
                <span className="legend-color weekend"></span>
                <span className="legend-text">Weekend</span>
              </div>

              <div className="legend-item">
                <span className="legend-color holiday"></span>
                <span className="legend-text">Holiday</span>
              </div>

              <div className="legend-item">
                <span className="legend-color absent"></span>
                <span className="legend-text">Absent</span>
              </div>
            </div>
          </>
        )}

        <div className="mt-3">
          <Button variant="outline-primary" size="sm" onClick={handleToday}>
            Today
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default React.memo(AttendanceCalendar);