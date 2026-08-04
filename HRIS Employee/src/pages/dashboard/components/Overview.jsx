import React, { useState, useEffect, useMemo } from "react";
import { Card, Button, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import api from "@/config/axios";

const Overview = ({ selectedMonth, selectedYear }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    present: 0,
    missed: 0,
    absent: 0,
    late: 0,
    presentPercentage: 0,
    missedPercentage: 0,
    absentPercentage: 0,
    latePercentage: 0,
  });

  const chartData = useMemo(
    () => [
      {
        name: "Present",
        value: attendanceData.present,
        fill: "#28a745",
      },
      {
        name: "Missed",
        value: attendanceData.missed,
        fill: "#17a2b8",
      },
      {
        name: "Absent",
        value: attendanceData.absent,
        fill: "#dc3545",
      },
      {
        name: "Late",
        value: attendanceData.late,
        fill: "#ffc107",
      },
    ],
    [attendanceData],
  );

  // Fetch data when selectedMonth or selectedYear changes
  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        setError(null);

        const month = selectedMonth || new Date().getMonth() + 1;
        const year = selectedYear || new Date().getFullYear();

        console.log("Fetching overview for:", { month, year });

        // Use the calendar endpoint that we know works
        const response = await api.get("/dashboard/calendar", {
          params: { month, year },
        });

        console.log("Calendar API Response:", response.data);

        if (response.data.success) {
          const calendar = response.data.calendar || [];

          // Get current date for comparison
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Remove time for accurate comparison

          // Calculate statistics from calendar data
          let present = 0;
          let missed = 0;
          let absent = 0;
          let late = 0;

          calendar.forEach(record => {
            const status = record.status?.toLowerCase();
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);

            // For absent status, only count if the date is today or in the past
            if (status === 'absent') {
              if (recordDate <= today) {
                absent++;
              }
            }
            // For present and missed, count all (they can only be recorded for past dates anyway)
            else if (status === 'present') {
              present++;
            }
            else if (status === 'missed') {
              missed++;
            }
            else if (status === 'late') {
              late++;
            }
          
          });

          console.log(`Statistics for ${month}/${year}:`, { present, missed, absent, late });
          console.log("Today's date:", today);

          const total = present + missed + absent + late;

          if (total > 0) {
            setAttendanceData({
              present,
              missed,
              absent,
              late,
              presentPercentage: Math.round((present / total) * 100),
              missedPercentage: Math.round((missed / total) * 100),
              absentPercentage: Math.round((absent / total) * 100),
              latePercentage: Math.round((late / total) * 100),
            });
          } else {
            setAttendanceData({
              present: 0,
              missed: 0,
              absent: 0,
              late: 0,
              presentPercentage: 0,
              missedPercentage: 0,
              absentPercentage: 0,
              latePercentage: 0,
            });
          }
        } else {
          setError(response.data.message || "Failed to load attendance data");
        }
      } catch (err) {
        console.error("Error fetching overview:", err);
        setError(err.response?.data?.message || "Failed to load attendance overview");
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [selectedMonth, selectedYear]);

  // Get month name for display
  const monthName = selectedMonth ? new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' }) : '';

  return (
    <Card className="dashboard-card-modern h-100">
      <Card.Header className="card-header-custom">
        <div className="d-flex align-items-center justify-content-between">
          <h5>Overview - {monthName} {selectedYear}</h5>
          <Link to="/attendance">
            <Button size="sm" variant="outline-primary">
              View All
            </Button>
          </Link>
        </div>
      </Card.Header>

      <Card.Body>
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
          <>
            <div className="attendance-chart-wrapper">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
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
                    height={36}
                    wrapperStyle={{ paddingTop: "20px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="attendance-stats-container mt-3">
              <Row className="g-3 mb-3">
                {/* PRESENT */}
                <Col xs={12} sm={6}>
                  <div className="attendance-stat-card present-stat">
                    <div className="stat-header">
                      <div className="stat-color-indicator present"></div>
                      <h6 className="mb-0">Present</h6>
                    </div>
                    <div className="stat-content text-center">
                      <h2 className="mb-0">{attendanceData.present}</h2>
                      <small className="text-muted">days</small>
                      <div className="stat-percentage mt-2">
                        <span className="percentage-badge success">
                          {attendanceData.presentPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* MISSED */}
                <Col xs={12} sm={6}>
                  <div className="attendance-stat-card missed-stat">
                    <div className="stat-header">
                      <div className="stat-color-indicator missed"></div>
                      <h6 className="mb-0">Missed</h6>
                    </div>
                    <div className="stat-content text-center">
                      <h2 className="mb-0">{attendanceData.missed}</h2>
                      <small className="text-muted">days</small>
                      <div className="stat-percentage mt-2">
                        <span className="percentage-badge missed">
                          {attendanceData.missedPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* ABSENT */}
                <Col xs={12} sm={6}>
                  <div className="attendance-stat-card absent-stat">
                    <div className="stat-header">
                      <div className="stat-color-indicator absent"></div>
                      <h6 className="mb-0">Absent</h6>
                    </div>
                    <div className="stat-content text-center">
                      <h2 className="mb-0">{attendanceData.absent}</h2>
                      <small className="text-muted">days</small>
                      <div className="stat-percentage mt-2">
                        <span className="percentage-badge danger">
                          {attendanceData.absentPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Col>

                 {/* LATE */}
                <Col xs={12} sm={6}>
                  <div className="attendance-stat-card late-stat">
                    <div className="stat-header">
                      <div className="stat-color-indicator late"></div>
                      <h6 className="mb-0">Late</h6>
                    </div>
                    <div className="stat-content text-center">
                      <h2 className="mb-0">{attendanceData.late}</h2>
                      <small className="text-muted">days</small>
                      <div className="stat-percentage mt-2">
                        <span className="percentage-badge warning">
                          {attendanceData.latePercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Summary message */}
            {attendanceData.present === 0 && attendanceData.missed === 0 && attendanceData.absent === 0 && (
              <div className="text-center text-muted mt-3">
                <p>No attendance records found for {monthName} {selectedYear}</p>
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default React.memo(Overview);