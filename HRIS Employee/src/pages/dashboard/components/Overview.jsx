import React, { useState, useEffect, useMemo } from "react";
import { Card, Row, Col } from "react-bootstrap";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import api from "@/config/axios";

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

  const chartData = useMemo(
    () => [
      { name: "Present", value: attendanceData.present, fill: "#28a745" },
      { name: "Absent", value: attendanceData.absent, fill: "#dc3545" },
      { name: "Late", value: attendanceData.late, fill: "#ffc107" },
    ],
    [attendanceData],
  );

  const monthValue = selectedMonth || new Date().getMonth() + 1;
  const yearValue = selectedYear || new Date().getFullYear();
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

          const holidayItems = calendar
            .filter((record) => {
              const holidayName = record.holiday?.name || record.holiday_name || record.name;
              const holidayDate = record.date || record.holiday_date;
              return Boolean(holidayName) && Boolean(holidayDate);
            })
            .map((record) => ({
              id: record.date || record.holiday_date,
              name: record.holiday?.name || record.holiday_name || record.name,
              date: record.date || record.holiday_date,
            }))
            .filter(
              (item, index, array) =>
                array.findIndex((entry) => entry.id === item.id) === index,
            )
            .slice(0, 4);

          setUpcomingHolidays(holidayItems);

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
              <h5>Overview - {monthName} {yearValue}</h5>
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
                <div className="attendance-chart-wrapper">
                  <ResponsiveContainer width="100%" height={290}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value, percent }) =>
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={true}
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

                      <Legend
                        verticalAlign="bottom"
                        height={30}
                        wrapperStyle={{ paddingTop: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {attendanceData.present === 0 &&
                    attendanceData.absent === 0 &&
                    attendanceData.late === 0 && (
                      <div className="chart-empty-message">
                        No attendance records found for {monthName} {yearValue}
                      </div>
                    )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={12}>
          <Card className="dashboard-card-modern h-100">
            <Card.Header className="card-header-custom">
              <h5>Attendance Summary</h5>
            </Card.Header>
            <Card.Body className="p-3">
              {!loading && !error && (
                <div className="attendance-summary-stack">
                  {stats.map((item) => (
                    <div key={item.label} className="attendance-summary-card">
                      <div className="summary-header-row">
                        <span className={`summary-dot ${item.dotClass}`} />
                        <span className="summary-label">{item.label}</span>
                      </div>

                      <div className="summary-value-row">
                        <span className="summary-value">{item.count}</span>
                        <span className="summary-unit">days</span>
                      </div>

                      <div className="summary-pill-wrap">
                        <span className={`summary-pill ${item.tone}`}>
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} md={12}>
          <Card className="dashboard-card-modern h-100">
            <Card.Header className="card-header-custom">
              <h5>Upcoming Holidays</h5>
            </Card.Header>
            <Card.Body className="p-3">
              {upcomingHolidays.length > 0 ? (
                <div className="upcoming-holidays-list">
                  {upcomingHolidays.map((holiday) => (
                    <div key={holiday.id} className="upcoming-holiday-item">
                      <span className="holiday-bullet" />
                      <div className="holiday-text">
                        <strong>
                          {new Date(`${holiday.date}T00:00:00`).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </strong>
                        <small>{holiday.name}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted text-center py-4 small">
                  No upcoming holidays for this month.
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default React.memo(Overview);