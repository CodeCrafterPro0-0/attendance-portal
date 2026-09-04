import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./AdminDashboard.css";

function getDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    return date.toISOString().split("T")[0];
}

function getWeekStart() {
    const date = new Date();

    // Sunday = 0
    // Convert to Monday-based week
    const day = date.getDay();
    const difference = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + difference);

    return date.toISOString().split("T")[0];
}

function AdminDashboard() {
    const [stats, setStats] = useState({
        totalMembers: 0,
        present: 0,
        late: 0,
        earlyLeave: 0,
        inattentive: 0,
        absent: 0,
    });

    const [presentLeaderboard, setPresentLeaderboard] = useState([]);
    const [absentLeaderboard, setAbsentLeaderboard] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadDashboardStats();
    }, []);

    async function loadDashboardStats() {
        setLoading(true);
        setError("");

        const today = getDate();
        const weekStart = getWeekStart();

        // Total members
        const {
            count: totalMembers,
            error: membersError,
        } = await supabase
            .from("profiles")
            .select("*", {
                count: "exact",
                head: true,
            })
            .eq("role", "member");

        if (membersError) {
            console.error(membersError);
            setError("Unable to load dashboard statistics.");
            setLoading(false);
            return;
        }

        // Today's attendance
        const {
            data: todayAttendance,
            error: todayAttendanceError,
        } = await supabase
            .from("attendance")
            .select(
                "status, is_late, early_leave, inattentive"
            )
            .eq("attendance_date", today);

        if (todayAttendanceError) {
            console.error(todayAttendanceError);
            setError("Unable to load attendance statistics.");
            setLoading(false);
            return;
        }

        // This week's attendance
        const {
            data: weeklyAttendance,
            error: weeklyAttendanceError,
        } = await supabase
            .from("attendance")
            .select(
                "member_id, attendance_date, status, is_late, early_leave, inattentive"
            )
            .gte("attendance_date", weekStart)
            .lte("attendance_date", today)
            .not("member_id", "is", null);

        if (weeklyAttendanceError) {
            console.error(weeklyAttendanceError);
            setError("Unable to load weekly attendance.");
            setLoading(false);
            return;
        }

        // Today's statistics
        const present = todayAttendance.filter(
            (record) =>
                record.status === "present"
        ).length;

        const late = todayAttendance.filter(
            (record) =>
                record.status === "present" &&
                record.is_late
        ).length;

        const earlyLeave = todayAttendance.filter(
            (record) =>
                record.status === "absent" &&
                record.early_leave
        ).length;

        const inattentive = todayAttendance.filter(
            (record) =>
                record.status === "absent" &&
                record.inattentive
        ).length;

        const absent = todayAttendance.filter(
            (record) =>
                record.status === "absent" &&
                !record.early_leave &&
                !record.inattentive
        ).length;

        // Get member names for leaderboard
        const {
            data: members,
            error: leaderboardMembersError,
        } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("role", "member");

        if (leaderboardMembersError) {
            console.error(leaderboardMembersError);
            setError("Unable to load leaderboard.");
            setLoading(false);
            return;
        }

        // Create a count for every member
        const memberStats = {};

        members.forEach((member) => {
            memberStats[member.id] = {
                id: member.id,
                full_name: member.full_name,
                present: 0,
                absent: 0,
            };
        });

        // Count weekly attendance
        weeklyAttendance.forEach((record) => {
            const member = memberStats[record.member_id];

            if (!member) {
                return;
            }

            // Present and Late both count as attended
            if (record.status === "present") {
                member.present += 1;
            }

            // Absent, Early Leave and Inattentive all count as absent
            if (record.status === "absent") {
                member.absent += 1;
            }
        });

        const leaderboardMembers = Object.values(memberStats);

        // Top 5 Present
        const topPresent = [...leaderboardMembers]
            .sort((a, b) => {
                if (b.present !== a.present) {
                    return b.present - a.present;
                }

                return b.absent - a.absent;
            })
            .slice(0, 5);

        // Top 5 Absent
        const topAbsent = [...leaderboardMembers]
            .sort((a, b) => {
                if (b.absent !== a.absent) {
                    return b.absent - a.absent;
                }

                return a.present - b.present;
            })
            .slice(0, 5);

        setStats({
            totalMembers: totalMembers ?? 0,
            present,
            late,
            earlyLeave,
            inattentive,
            absent,
        });

        setPresentLeaderboard(topPresent);
        setAbsentLeaderboard(topAbsent);

        setLoading(false);
    }

    return (
        <section className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>
                        Overview of today's attendance.
                    </p>
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
                    <span className="stat-label">
                        Total Members
                    </span>

                    <strong className="stat-value">
                        {loading
                            ? "—"
                            : stats.totalMembers}
                    </strong>
                </div>

                <div className="stat-card">
                    <span className="stat-label">
                        Present Today
                    </span>

                    <strong className="stat-value">
                        {loading
                            ? "—"
                            : stats.present}
                    </strong>
                </div>

                <div className="stat-card">
                    <span className="stat-label">
                        Late Today
                    </span>

                    <strong className="stat-value">
                        {loading
                            ? "—"
                            : stats.late}
                    </strong>
                </div>

                <div className="stat-card">
                    <span className="stat-label">
                        Early Leave
                    </span>

                    <strong className="stat-value">
                        {loading
                            ? "—"
                            : stats.earlyLeave}
                    </strong>
                </div>

                <div className="stat-card">
                    <span className="stat-label">
                        Inattentive Today
                    </span>

                    <strong className="stat-value">
                        {loading
                            ? "—"
                            : stats.inattentive}
                    </strong>
                </div>

                <div className="stat-card">
                    <span className="stat-label">
                        Absent Today
                    </span>

                    <strong className="stat-value">
                        {loading
                            ? "—"
                            : stats.absent}
                    </strong>
                </div>
            </div>

            <div className="leaderboards">
                {/* Present Leaderboard */}

                <div className="leaderboard-card">
                    <div className="leaderboard-header">
                        <div>
                            <h2>🏆 Most Present</h2>
                            <p>
                                Top members this week
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="leaderboard-loading">
                            Loading leaderboard...
                        </div>
                    ) : presentLeaderboard.length === 0 ? (
                        <div className="leaderboard-empty">
                            No attendance records this week.
                        </div>
                    ) : (
                        <div className="leaderboard-list">
                            {presentLeaderboard.map(
                                (member, index) => (
                                    <div
                                        className="leaderboard-row"
                                        key={member.id}
                                    >
                                        <div className="leaderboard-rank">
                                            {index + 1}
                                        </div>

                                        <div className="leaderboard-member">
                                            <div className="leaderboard-avatar">
                                                {member.full_name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <strong>
                                                {member.full_name}
                                            </strong>
                                        </div>

                                        <div className="leaderboard-count">
                                            <strong>
                                                {member.present}
                                            </strong>

                                            <span>
                                                {member.present ===
                                                1
                                                    ? "day"
                                                    : "days"}
                                            </span>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Absent Leaderboard */}

                <div className="leaderboard-card">
                    <div className="leaderboard-header">
                        <div>
                            <h2>⚠️ Most Absent</h2>
                            <p>
                                Top absences this week
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="leaderboard-loading">
                            Loading leaderboard...
                        </div>
                    ) : absentLeaderboard.length === 0 ? (
                        <div className="leaderboard-empty">
                            No attendance records this week.
                        </div>
                    ) : (
                        <div className="leaderboard-list">
                            {absentLeaderboard.map(
                                (member, index) => (
                                    <div
                                        className="leaderboard-row"
                                        key={member.id}
                                    >
                                        <div className="leaderboard-rank">
                                            {index + 1}
                                        </div>

                                        <div className="leaderboard-member">
                                            <div className="leaderboard-avatar">
                                                {member.full_name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <strong>
                                                {member.full_name}
                                            </strong>
                                        </div>

                                        <div className="leaderboard-count">
                                            <strong>
                                                {member.absent}
                                            </strong>

                                            <span>
                                                {member.absent ===
                                                1
                                                    ? "day"
                                                    : "days"}
                                            </span>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="dashboard-section">
                <h2>Today's Attendance</h2>

                {loading ? (
                    <p>
                        Loading attendance...
                    </p>
                ) : (
                    <p>
                        {stats.present + stats.absent}{" "}
                        attendance records have been
                        recorded today.
                    </p>
                )}
            </div>
        </section>
    );
}

export default AdminDashboard;