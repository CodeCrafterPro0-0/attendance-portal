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

    const [leaderboard, setLeaderboard] = useState([]);
    const [leaderboardMode, setLeaderboardMode] =
        useState("present");

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
            setError(
                "Unable to load dashboard statistics."
            );
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
            setError(
                "Unable to load attendance statistics."
            );
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
            setError(
                "Unable to load weekly attendance."
            );
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

        // Get all members

        const {
            data: members,
            error: leaderboardMembersError,
        } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("role", "member")
            .order("full_name", {
                ascending: true,
            });

        if (leaderboardMembersError) {
            console.error(
                leaderboardMembersError
            );
            setError("Unable to load leaderboard.");
            setLoading(false);
            return;
        }

        // Create stats for every member

        const memberStats = {};

        members.forEach((member) => {
            memberStats[member.id] = {
                id: member.id,
                full_name: member.full_name,
                present: 0,
                absent: 0,
            };
        });

        // Calculate weekly attendance

        weeklyAttendance.forEach((record) => {
            const member =
                memberStats[record.member_id];

            if (!member) {
                return;
            }

            // Present + Late = attended
            if (record.status === "present") {
                member.present += 1;
            }

            // Absent + Early Leave + Inattentive = absent
            if (record.status === "absent") {
                member.absent += 1;
            }
        });

        const allMembers =
            Object.values(memberStats);

        setLeaderboard(allMembers);

        setStats({
            totalMembers: totalMembers ?? 0,
            present,
            late,
            earlyLeave,
            inattentive,
            absent,
        });

        setLoading(false);
    }

    const sortedLeaderboard = [...leaderboard].sort(
        (a, b) => {
            if (leaderboardMode === "present") {
                if (b.present !== a.present) {
                    return b.present - a.present;
                }

                return a.full_name.localeCompare(
                    b.full_name
                );
            }

            if (b.absent !== a.absent) {
                return b.absent - a.absent;
            }

            return a.full_name.localeCompare(
                b.full_name
            );
        }
    );

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
                    {loading
                        ? "Loading..."
                        : "Refresh"}
                </button>
            </div>

            {error && (
                <div className="dashboard-error">
                    {error}
                </div>
            )}

            {/* Statistics */}

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

            {/* Leaderboard */}

            <div className="leaderboard-card">
                <div className="leaderboard-header">
                    <div>
                        <h2>Weekly Leaderboard</h2>

                        <p>
                            Attendance performance this
                            week.
                        </p>
                    </div>

                    <div className="leaderboard-toggle">
                        <button
                            type="button"
                            className={
                                leaderboardMode ===
                                "present"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setLeaderboardMode(
                                    "present"
                                )
                            }
                        >
                            Most Present
                        </button>

                        <button
                            type="button"
                            className={
                                leaderboardMode ===
                                "absent"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setLeaderboardMode(
                                    "absent"
                                )
                            }
                        >
                            Most Absent
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="leaderboard-loading">
                        Loading leaderboard...
                    </div>
                ) : sortedLeaderboard.length === 0 ? (
                    <div className="leaderboard-empty">
                        No members have been added yet.
                    </div>
                ) : (
                    <div className="leaderboard-list">
                        {sortedLeaderboard.map(
                            (member, index) => {
                                const count =
                                    leaderboardMode ===
                                    "present"
                                        ? member.present
                                        : member.absent;

                                return (
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
                                                    .charAt(
                                                        0
                                                    )
                                                    .toUpperCase()}
                                            </div>

                                            <strong>
                                                {
                                                    member.full_name
                                                }
                                            </strong>
                                        </div>

                                        <div className="leaderboard-count">
                                            <strong>
                                                {count}
                                            </strong>

                                            <span>
                                                {count ===
                                                1
                                                    ? "day"
                                                    : "days"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            }
                        )}
                    </div>
                )}
            </div>

            {/* Today's attendance */}

            <div className="dashboard-section">
                <h2>Today's Attendance</h2>

                {loading ? (
                    <p>
                        Loading attendance...
                    </p>
                ) : (
                    <p>
                        {stats.present +
                            stats.absent}{" "}
                        attendance records have been
                        recorded today.
                    </p>
                )}
            </div>
        </section>
    );
}

export default AdminDashboard;