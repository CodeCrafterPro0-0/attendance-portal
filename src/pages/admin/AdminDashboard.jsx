import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./AdminDashboard.css";

function AdminDashboard() {
    const [stats, setStats] = useState({
        totalMembers: 0,
        present: 0,
        late: 0,
        earlyLeave: 0,
        absent: 0,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadDashboardStats();
    }, []);

    async function loadDashboardStats() {
        setLoading(true);
        setError("");

        const today = new Date().toLocaleDateString("en-CA");

        // Total members
        const { count: totalMembers, error: membersError } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "member");

        if (membersError) {
            console.error(membersError);
            setError("Unable to load dashboard statistics.");
            setLoading(false);
            return;
        }

        // Today's attendance
        const { data: attendance, error: attendanceError } = await supabase
            .from("attendance")
            .select("status, is_late, early_leave")
            .eq("attendance_date", today);

        if (attendanceError) {
            console.error(attendanceError);
            setError("Unable to load attendance statistics.");
            setLoading(false);
            return;
        }

        const present = attendance.filter(
            (record) => record.status === "present"
        ).length;

        const late = attendance.filter(
            (record) => record.is_late
        ).length;

        const earlyLeave = attendance.filter(
            (record) => record.early_leave
        ).length;

        const absent = attendance.filter(
            (record) => record.status === "absent"
        ).length;

        setStats({
            totalMembers: totalMembers ?? 0,
            present,
            late,
            earlyLeave,
            absent,
        });

        setLoading(false);
    }

    return (
        <section className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Overview of today's attendance.</p>
                </div>

                <button
                    className="refresh-button"
                    onClick={loadDashboardStats}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {error && (
                <div className="dashboard-error">
                    {error}
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-label">Total Members</span>
                    <strong className="stat-value">
                        {loading ? "—" : stats.totalMembers}
                    </strong>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Present Today</span>
                    <strong className="stat-value">
                        {loading ? "—" : stats.present}
                    </strong>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Late Today</span>
                    <strong className="stat-value">
                        {loading ? "—" : stats.late}
                    </strong>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Early Leave</span>
                    <strong className="stat-value">
                        {loading ? "—" : stats.earlyLeave}
                    </strong>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Absent Today</span>
                    <strong className="stat-value">
                        {loading ? "—" : stats.absent}
                    </strong>
                </div>
            </div>

            <div className="dashboard-section">
                <h2>Today's Attendance</h2>

                {loading ? (
                    <p>Loading attendance...</p>
                ) : (
                    <p>
                        {attendanceCount(stats)} attendance records have been
                        recorded today.
                    </p>
                )}
            </div>
        </section>
    );
}

function attendanceCount(stats) {
    return stats.present + stats.absent;
}

export default AdminDashboard;