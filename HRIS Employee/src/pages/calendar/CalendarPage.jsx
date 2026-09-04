import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import AdminLayout from "@/components/layout/Adminlayout";
import api from "@/config/axios";
import "@/pages/calendar/CalendarPage.css";

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getHolidayDateKey = (value) => {
  if (!value) return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.year}-${values.month}-${values.day}`;
};

const isArchived = (record = {}) =>
  [1, "1", true, "true"].includes(record.is_archived ?? record.isArchived);

const inFlightRequests = new Map();
const REQUEST_DEBOUNCE_MS = 250;

const getSharedRequest = (key, request) => {
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);

  const sharedRequest = request().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, sharedRequest);
  return sharedRequest;
};

const CalendarPage = ({ setIsAuth }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [isHolidaySidebarOpen, setIsHolidaySidebarOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const monthPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target)) {
        setIsMonthPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setPickerDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  useEffect(() => {
    let isCurrentRequest = true;
    let debounceTimer = null;

    const fetchCalendar = async () => {
      setLoading(true);
      setError(null);

      try {
        const month = selectedDate.getMonth() + 1;
        const year = selectedDate.getFullYear();

        const [calendarResponse, attendanceResponse, holidaysResponse] = await Promise.all([
          getSharedRequest(
            `calendar:${year}-${month}`,
            () => api.get("/dashboard/calendar", { params: { month, year } }),
          ),
          getSharedRequest("my-attendance", () => api.get("/my-attendance")),
          getSharedRequest("getholidays", () => api.get("/getholidays")),
        ]);

        if (!isCurrentRequest) return;

        const calendarRecords = calendarResponse.data?.calendar || [];
        const attendanceRecords =
          attendanceResponse.data?.attendance ||
          attendanceResponse.data?.recentAttendance ||
          [];
        const holidayRecords = Array.isArray(holidaysResponse.data)
          ? holidaysResponse.data
          : holidaysResponse.data?.data ||
            holidaysResponse.data?.holidays ||
            holidaysResponse.data?.records ||
            [];

        const recordsByDate = new Map(
          calendarRecords.map((record) => [record.date, record]),
        );

        holidayRecords.forEach((holiday) => {
          if (isArchived(holiday)) return;

          const holidayDate = holiday.holiday_date || holiday.date || holiday.holidayDate;
          if (!holidayDate) return;

          const date = getHolidayDateKey(holidayDate);
          if (!date) return;
          const existingRecord = recordsByDate.get(date) || {};
          recordsByDate.set(date, {
            ...existingRecord,
            date,
            holiday: {
              name: holiday.holiday_name || holiday.name || holiday.holiday || "Holiday",
              type: holiday.holiday_type || holiday.type || "Holiday",
            },
          });
        });

        attendanceRecords.forEach((attendance) => {
          const attendanceDate = attendance.clock_in?.slice(0, 10) || attendance.date;
          if (!attendanceDate) return;

          const existingRecord = recordsByDate.get(attendanceDate) || {};
          const normalizedHoliday = existingRecord.holiday || attendance.holiday || (
            attendance.holiday_name ? {
              name: attendance.holiday_name,
              type: attendance.holiday_type || attendance.type || "Holiday",
            } : null
          );

          recordsByDate.set(attendanceDate, {
            ...existingRecord,
            ...attendance,
            date: attendanceDate,
            status: attendance.status || existingRecord.status || "present",
            holiday: normalizedHoliday,
          });
        });

        setCalendarData(Array.from(recordsByDate.values()));
      } catch (requestError) {
        if (!isCurrentRequest) return;

        if (requestError.response?.status === 429) {
          setError("Too many requests. Please wait a moment and try again.");
          return;
        }

        setError(requestError.response?.data?.message || "Failed to load calendar");
      } finally {
        if (isCurrentRequest) {
          setLoading(false);
        }
      }
    };

    debounceTimer = setTimeout(fetchCalendar, REQUEST_DEBOUNCE_MS);

    return () => {
      isCurrentRequest = false;
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [selectedDate]);

  const weekStart = useMemo(() => {
    const start = new Date(selectedDate);
    const day = start.getDay();
    start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
    start.setHours(0, 0, 0, 0);
    return start;
  }, [selectedDate]);

  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    }),
    [weekStart],
  );

  const recordsByDate = useMemo(
    () => new Map(calendarData.map((record) => [record.date, record])),
    [calendarData],
  );

  const getHolidayData = (record) => {
    if (!record) return null;
    if (record.holiday) return record.holiday;
    if (record.holiday_name) {
      return {
        name: record.holiday_name,
        type: record.holiday_type || record.type || "Holiday",
      };
    }
    return null;
  };

  const holidayRecords = useMemo(
    () => [...calendarData]
      .filter((record) => getHolidayData(record))
      .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [calendarData],
  );

  const changeWeek = (amount) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + amount * 7);
    setSelectedDate(nextDate);
  };

  const monthLabel = selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const weekLabel = `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekDays[4].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const isAttendanceVisible = (record) => {
    const status = record?.status?.toLowerCase();
    const isLeave = status === "leave";
    const isAttendance = ["present", "late", "absent", "missed"].includes(status);

    if (record?.holiday && status === "absent") return false;
    return isAttendance || isLeave;
  };

  const getAttendanceEvents = (record) => {
    if (!record) return [];

    const events = [];
    const addEvent = (type, value, label) => {
      if (!value) return;

      const time = new Date(value);
      if (Number.isNaN(time.getTime())) return;

      events.push({
        key: `${record.date}-${type}`,
        type,
        label,
        time,
        top: getHourPosition(time),
      });
    };

    addEvent("in", record.clock_in, "Clock In");
    addEvent("out", record.clock_out, "Clock Out");

    return events;
  };

  const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const timeGridHours = Array.from({ length: 16 }, (_, index) => {
    const hourValue = (19 + index) % 24;
    const date = new Date();
    date.setHours(hourValue, 0, 0, 0);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  });

  const getHourPosition = (value) => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const minutes = date.getHours() * 60 + date.getMinutes();
    const sevenPmMinutes = 19 * 60;
    const relativeMinutes = minutes >= sevenPmMinutes
      ? minutes - sevenPmMinutes
      : minutes + 24 * 60 - sevenPmMinutes;

    return Math.min(Math.max(relativeMinutes, 0), 15 * 60) * (64 / 60);
  };

  const getHolidayName = (record) =>
    getHolidayData(record)?.name || "Holiday";

  const getHolidayType = (record) => {
    const type = getHolidayData(record)?.type;

    if (typeof type === "string") return type;
    if (type && typeof type === "object") {
      return type.type_name || type.name || type.description || "Holiday";
    }

    return "Holiday";
  };

  const showHoliday = true;

  const getMonthGrid = (baseDate) => {
    const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const startOfGrid = new Date(monthStart);
    startOfGrid.setDate(monthStart.getDate() - monthStart.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startOfGrid);
      date.setDate(startOfGrid.getDate() + index);
      return date;
    });
  };

  const openMonthPicker = () => {
    setPickerDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setIsMonthPickerOpen((current) => !current);
  };

  const selectCalendarDate = (date) => {
    const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDate(nextDate);
    setPickerDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setIsMonthPickerOpen(false);
  };

  const selectHoliday = (record) => {
    setSelectedHoliday(record);
    selectCalendarDate(new Date(`${record.date}T00:00:00`));
  };

  return (
    <AdminLayout setIsAuth={setIsAuth}>
      <main className={`holiday-page teams-calendar-page ${isHolidaySidebarOpen ? "holiday-sidebar-open" : ""}`}>
        <div className="teams-calendar-toolbar">
          <div className="teams-toolbar-left month-picker-wrapper" ref={monthPickerRef}>
            <button type="button" className="teams-today-button" onClick={() => setSelectedDate(new Date())}>Today</button>
            <button type="button" className="teams-icon-button" onClick={() => changeWeek(-1)} aria-label="Previous week">&#8249;</button>
            <button type="button" className="teams-icon-button" onClick={() => changeWeek(1)} aria-label="Next week">&#8250;</button>
            <button type="button" className="teams-month-title" onClick={openMonthPicker}>
              {monthLabel}
            </button>

            {isMonthPickerOpen && (
              <div className="month-picker-popover" role="dialog" aria-label="Select month">
                <div className="month-picker-header">
                  <button
                    type="button"
                    className="month-picker-nav"
                    onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1))}
                    aria-label="Previous month"
                  >
                    &#8249;
                  </button>
                  <span>{pickerDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                  <button
                    type="button"
                    className="month-picker-nav"
                    onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1))}
                    aria-label="Next month"
                  >
                    &#8250;
                  </button>
                </div>

                <div className="month-picker-weekdays" aria-hidden="true">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="month-picker-grid">
                  {getMonthGrid(pickerDate).map((date) => {
                    const isCurrentMonth = date.getMonth() === pickerDate.getMonth();
                    const isSelected = getDateKey(date) === getDateKey(selectedDate);

                    return (
                      <button
                        key={getDateKey(date)}
                        type="button"
                        className={`month-picker-day ${isCurrentMonth ? "" : "muted"} ${isSelected ? "selected" : ""}`}
                        onClick={() => selectCalendarDate(date)}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="teams-toolbar-right">
            <span>{weekLabel}</span>
            <button
              type="button"
              className="holiday-sidebar-toggle"
              onClick={() => setIsHolidaySidebarOpen((isOpen) => !isOpen)}
              aria-label={isHolidaySidebarOpen ? "Close holiday sidebar" : "Open holiday sidebar"}
              aria-expanded={isHolidaySidebarOpen}
            >
              <span aria-hidden="true">&#9776;</span>
            </button>
          </div>
        </div>

        {/* <div className="teams-calendar-filters" role="group" aria-label="Calendar filters">
          {["all", "attendance", "holidays", "leave"].map((filter) => (
            <button
              key={filter}
              type="button"
              className={`teams-filter-button ${activeFilter === filter ? "active" : ""}`}
              onClick={() => setActiveFilter(filter)}
              aria-pressed={activeFilter === filter}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div> */}

        {error && <div className="alert alert-danger">{error}</div>}

        <div className={`holiday-calendar-layout ${isHolidaySidebarOpen ? "sidebar-open" : ""}`}>
          <div className="teams-calendar-shell">
          <div className="teams-calendar-header">
            <div className="teams-time-column-label">All day</div>
            {weekDays.map((date) => (
              <div key={getDateKey(date)} className="teams-day-header">
                <strong>{date.getDate()}</strong>
                <span>{date.toLocaleDateString("en-US", { weekday: "long" })}</span>
              </div>
            ))}
          </div>

          <div className="teams-all-day-row">
            <div className="teams-time-column-label">Events</div>
            {weekDays.map((date) => {
              const record = recordsByDate.get(getDateKey(date));
              const holidayInfo = getHolidayData(record);
              const holidayVisible = Boolean(holidayInfo) && showHoliday;
              return (
                <div key={getDateKey(date)} className="teams-event-cell">
                  {holidayVisible && (
                    <button
                      type="button"
                      className="teams-event teams-event-holiday"
                      onClick={() => setSelectedHoliday(record)}
                    >
                      <strong>{getHolidayName(record)}</strong>
                      <small>{getHolidayType(record)}</small>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="teams-time-grid-wrapper">
            <div className="teams-time-grid">
              {timeGridHours.map((hourLabel, index) => (
                <React.Fragment key={`${hourLabel}-${index}`}>
                  <div className="teams-hour-label">{hourLabel}</div>
                  {weekDays.map((date) => (
                    <div key={`${getDateKey(date)}-${hourLabel}`} className="teams-hour-cell" />
                  ))}
                </React.Fragment>
              ))}
            </div>

            <div className="teams-time-events" aria-label="Attendance times">
              <div className="teams-time-events-spacer" />
              {weekDays.map((date) => {
                const record = recordsByDate.get(getDateKey(date));
                const attendanceEvents = record && isAttendanceVisible(record)
                  ? getAttendanceEvents(record)
                  : [];

                return (
                  <div key={getDateKey(date)} className="teams-day-events">
                    {attendanceEvents.map((event) => (
                      <div
                        key={event.key}
                        className={`teams-time-event teams-time-event-split teams-time-event-${event.type} teams-event-${record.status.toLowerCase()}`}
                        style={{ top: event.top }}
                      >
                        <strong>{event.label}</strong>
                        <span>{formatTime(event.time)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {loading && <div className="teams-calendar-loading">Loading calendar...</div>}
          </div>

          {isHolidaySidebarOpen && (
            <section className="upcoming-holidays" aria-labelledby="upcoming-holidays-title">
              <div className="upcoming-holidays-header">
                <div>
                  <p className="upcoming-holidays-eyebrow">All holidays</p>
                  <h2 id="upcoming-holidays-title">Holiday List</h2>
                </div>
              </div>

              {holidayRecords.length > 0 ? (
                <div className="upcoming-holidays-list">
                  {holidayRecords.map((record) => (
                    <button
                      type="button"
                      className="upcoming-holiday-item"
                      key={record.date}
                      onClick={() => selectHoliday(record)}
                    >
                      <span className="upcoming-holiday-dot" />
                      <span>
                        <strong>{new Date(`${record.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong>
                        <small>{getHolidayName(record)}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="upcoming-holidays-empty">No holiday records available.</p>
              )}
            </section>
          )}
        </div>

        <Modal show={Boolean(selectedHoliday)} onHide={() => setSelectedHoliday(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{selectedHoliday && getHolidayName(selectedHoliday)}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedHoliday && (
              <dl className="holiday-detail-list">
                <div>
                  <dt>Date</dt>
                  <dd>{new Date(`${selectedHoliday.date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</dd>
                </div>
                <div>
                  <dt>Holiday Type</dt>
                  <dd>{getHolidayType(selectedHoliday)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>Active</dd>
                </div>
              </dl>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="holiday-close-button" onClick={() => setSelectedHoliday(null)}>
              Close
            </button>
          </Modal.Footer>
        </Modal>
      </main>
    </AdminLayout>
  );
};

export default CalendarPage;
