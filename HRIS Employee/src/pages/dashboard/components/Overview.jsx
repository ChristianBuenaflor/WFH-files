import React, { useState, useEffect, useMemo } from "react";
import { Card, Row, Col, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import api from "@/config/axios";

const getHolidayDate = (holiday = {}) => {
  const value = holiday.holiday_date || holiday.date || holiday.holidayDate || "";
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
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getHolidayName = (holiday = {}) =>
  holiday.holiday_name || holiday.name || holiday.holiday || "Holiday";

const getHolidayRecords = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  const records = responseData?.data || responseData?.holidays || responseData?.records;
  if (Array.isArray(records)) return records;
  if (Array.isArray(records?.data)) return records.data;
  if (Array.isArray(records?.holidays)) return records.holidays;
  if (Array.isArray(records?.records)) return records.records;
  return [];
};

const isActiveHoliday = (holiday = {}) => {
  const archived = holiday.is_archived ?? holiday.isArchived ?? false;
  return ![1, "1", true, "true"].includes(archived);
};

const Overview = ({ selectedMonth, selectedYear }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    present: 0,
    absent: 0,
    late: 0,
    presentPercentage: 0,
    absentPercentage: 0,
    latePercentage: 0,
  });
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const today = new Date();
  const [overviewMonth, setOverviewMonth] = useState(
    selectedMonth || today.getMonth() + 1,
  );
  const [overviewYear, setOverviewYear] = useState(
    selectedYear || today.getFullYear(),
  );

  const chartData = useMemo(
    () => [
      { name: "Present", value: attendanceData.present, fill: "#28a745" },
      { name: "Absent", value: attendanceData.absent, fill: "#dc3545" },
      { name: "Late", value: attendanceData.late, fill: "#ffc107" },
    ],
    [attendanceData],
  );

  const monthValue = selectedMonth || overviewMonth;
  const yearValue = selectedYear || overviewYear;
  const monthName = new Date(yearValue, monthValue - 1).toLocaleString("default", {
    month: "long",
  });

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get("/dashboard/calendar", {
          params: { month: monthValue, year: yearValue },
        });

        if (response.data.success) {
          const calendar = response.data.calendar || [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let present = 0;
          let absent = 0;
          let late = 0;

          calendar.forEach((record) => {
            const status = record.status?.toLowerCase();
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);

            if (status === "absent" && recordDate <= today) {
              absent += 1;
            } else if (status === "present") {
              present += 1;
            } else if (status === "late") {
              late += 1;
            }
          });

          const total = present + absent + late;

          setAttendanceData({
            present,
            absent,
            late,
            presentPercentage: total ? Math.round((present / total) * 100) : 0,
            absentPercentage: total ? Math.round((absent / total) * 100) : 0,
            latePercentage: total ? Math.round((late / total) * 100) : 0,
          });
        } else {
          setError(response.data.message || "Failed to load attendance data");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load attendance overview");
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [monthValue, yearValue]);

  useEffect(() => {
    const fetchUpcomingHolidays = async () => {
      try {
        const response = await api.get("/getholidays");
        const today = new Date();
        const todayKey = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
          .map((value, index) => (index === 0 ? value : String(value).padStart(2, "0")))
          .join("-");

        const holidayItems = getHolidayRecords(response.data)
          .filter(isActiveHoliday)
          .map((holiday) => {
            const date = getHolidayDate(holiday);

            return {
              id: date,
              name: getHolidayName(holiday),
              date,
            };
          })
          .filter((holiday) => /^\d{4}-\d{2}-\d{2}$/.test(holiday.date) && holiday.date >= todayKey)
          .sort((a, b) => a.date.localeCompare(b.date))
          .filter(
            (holiday, index, holidays) =>
              holidays.findIndex((item) => item.id === holiday.id) === index,
          )
          .slice(0, 4);

        setUpcomingHolidays(holidayItems);
      } catch {
        setUpcomingHolidays([]);
      }
    };

    fetchUpcomingHolidays();
  }, []);

  const stats = [
    {
      label: "Present",
      count: attendanceData.present,
      percentage: attendanceData.presentPercentage,
      tone: "present",
      dotClass: "theme-present",
    },
    {
      label: "Absent",
      count: attendanceData.absent,
      percentage: attendanceData.absentPercentage,
      tone: "absent",
      dotClass: "theme-absent",
    },
    {
      label: "Late",
      count: attendanceData.late,
      percentage: attendanceData.latePercentage,
      tone: "late",
      dotClass: "theme-late",
    },
  ];

  return (
    <div className="overview-layout-grid">
      <Row className="g-3">
        <Col lg={5} md={12}>
          <Card className="dashboard-card-modern h-100">
            <Card.Header className="card-header-custom">
              <h5>Attendance Overview</h5>
              <div className="overview-period-selectors">
                <select
                  className="overview-month-selector"
                  value={monthValue}
                  onChange={(event) => setOverviewMonth(Number(event.target.value))}
                  aria-label="Select month"
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" })}
                    </option>
                  ))}
                </select>
                <select
                  className="overview-month-selector"
                  value={yearValue}
                  onChange={(event) => setOverviewYear(Number(event.target.value))}
                  aria-label="Select year"
                >
                  {Array.from({ length: 7 }, (_, index) => new Date().getFullYear() - 3 + index).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </Card.Header>
            <Card.Body className="p-3">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {loading && (
                <div className="text-center text-muted py-4">
                  <div className="spinner-border text-primary mb-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p>Loading overview data...</p>
                </div>
              )}

              {!loading && !error && (
                <div className="attendance-chart-wrapper attendance-donut-layout">
                  <div className="attendance-donut-chart">
                    <ResponsiveContainer width="100%" height={190} minWidth={0} minHeight={0}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={57}
                          outerRadius={88}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e9ecef",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value, name) => [`${value} days`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="attendance-donut-center">
                      <strong>
                        {attendanceData.present + attendanceData.absent + attendanceData.late}
                      </strong>
                      <span>Total</span>
                    </div>
                  </div>

                  <div className="attendance-donut-legend">
                    {stats.map((item) => (
                      <div className="attendance-legend-item" key={item.label}>
                        <span className={`attendance-legend-dot ${item.dotClass}`} />
                        <div>
                          <strong>{item.label}</strong>
                          <span>{item.count} ({item.percentage}%)</span>
                          <div className="attendance-legend-progress">
                            <div
                              className={`attendance-legend-progress-fill ${item.dotClass}`}
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {attendanceData.present === 0 &&
                    attendanceData.absent === 0 &&
                    attendanceData.late === 0 && (
                      <div className="chart-empty-message-wrap">
                        <div className="chart-empty-message">
                          No attendance records found for {monthName} {yearValue}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} md={12}>
          <Card className="dashboard-card-modern h-100">
            <Card.Header className="card-header-custom">
              <h5>Attendance Summary</h5>
              <span className="overview-period-label">{monthName} {yearValue}</span>
            </Card.Header>
            <Card.Body className="p-3">
              {!loading && !error && (
                <div className="attendance-summary-chart">
                  <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={0}>
                    <BarChart data={stats} margin={{ top: 24, right: 12, left: 12, bottom: 0 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 13 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={32} />
                      <Tooltip
                        cursor={{ fill: "rgba(226, 232, 240, 0.35)" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const item = payload[0].payload;

                          return (
                            <div className="summary-chart-tooltip">
                              <strong>{item.label}</strong>
                              <span>{item.count} days</span>
                              <span>{item.percentage}%</span>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                        {stats.map((item) => (
                          <Cell key={item.label} fill={
                            item.tone === "present"
                              ? "#28a745"
                              : item.tone === "absent"
                                ? "#dc3545"
                                : "#ffc107"
                          } />
                        ))}
                        <LabelList dataKey="count" position="top" fill="#0f172a" fontSize={16} />
                      </Bar>
                      <LabelList
                        dataKey="percentage"
                        position="insideBottom"
                        formatter={(value) => `${value}%`}
                        fill="#0f172a"
                        fontSize={11}
                        fontWeight={600}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={12}>
          <Card className="dashboard-card-modern h-100">
            <Card.Header className="card-header-custom">
              <h5>Upcoming Holidays</h5>
              <Link to="/calendar">
                <Button size="sm" className="overview-calendar-button">
                  View Calendar
                </Button>
              </Link>
            </Card.Header>
            <Card.Body className="p-3">
              {upcomingHolidays.length > 0 ? (
                <div className="upcoming-holidays-list">
                  {upcomingHolidays.map((holiday) => (
                    <div key={holiday.id} className="upcoming-holiday-item">
                      <div className="holiday-date-tile">
                        <strong>
                          {new Date(`${holiday.date}T16:00:00.000000Z`).toLocaleDateString("en-US", {
                            month: "short",
                          }).toUpperCase()}
                        </strong>
                        <span>
                          {new Date(`${holiday.date}T16:00:00.000000Z`).getDate()}
                        </span>
                      </div>
                      <div className="holiday-text">
                        <strong>{holiday.name}</strong>
                        <small>
                          {new Date(`${holiday.date}T16:00:00.000000Z`).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted text-center py-4 small">
                  No upcoming holidays for this month.
                </div>
              )}
              {upcomingHolidays.length > 0 && (
                <button className="overview-holidays-link" type="button">
                  View all holidays <span aria-hidden="true">→</span>
                </button>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default React.memo(Overview);