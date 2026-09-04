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

    const [todayMembers, setTodayMembers] = useState([]);

    const [selectedStat, setSelectedStat] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [leaderboardMode, setLeaderboardMode] =
        useState("present");

    useEffect(() => {
        loadDashboardStats();
    }, []);

    async function loadDashboardStats() {
        setLoading(true);
        setError("");

        const today = getDate();
        const weekStart = getWeekStart();

        // Get members
        const {
            data: members,
            error: membersError,
        } = await supabase
            .from("profiles")
            .select(
                "id, full_name, created_at"
            )
            .eq("role", "member")
            .order("full_name", {
                ascending: true,
            });

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
                "member_id, status, is_late, early_leave, inattentive"
            )
            .eq("attendance_date", today)
            .not("member_id", "is", null);

        if (todayAttendanceError) {
            console.error(todayAttendanceError);
            setError(
                "Unable to load today's attendance."
            );
            setLoading(false);
            return;
        }

        // Weekly attendance
        const {
            data: weeklyAttendance,
            error: weeklyAttendanceError,
        } = await supabase
            .from("attendance")
            .select(
                "member_id, attendance_date, status, is_late, early_leave, inattentive"
            )
            .gte(
                "attendance_date",
                weekStart
            )
            .lte(
                "attendance_date",
                today
            )
            .not("member_id", "is", null);

        if (weeklyAttendanceError) {
            console.error(weeklyAttendanceError);
            setError(
                "Unable to load weekly attendance."
            );
            setLoading(false);
            return;
        }

        /*
         * Map member IDs to names
         */
        const memberMap = {};

        members.forEach((member) => {
            memberMap[member.id] = member;
        });

        /*
         * Today's people
         */

        const todayPeople = {
            total: members,
            present: [],
            late: [],
            earlyLeave: [],
            inattentive: [],
            absent: [],
        };

        todayAttendance.forEach((record) => {
            const member =
                memberMap[record.member_id];

            if (!member) {
                return;
            }

            if (
                record.status === "present" &&
                record.is_late
            ) {
                todayPeople.late.push(member);
                return;
            }

            if (
                record.status === "present"
            ) {
                todayPeople.present.push(member);
                return;
            }

            if (
                record.status === "absent" &&
                record.early_leave
            ) {
                todayPeople.earlyLeave.push(
                    member
                );
                return;
            }

            if (
                record.status === "absent" &&
                record.inattentive
            ) {
                todayPeople.inattentive.push(
                    member
                );
                return;
            }

            if (
                record.status === "absent"
            ) {
                todayPeople.absent.push(member);
            }
        });

        setTodayMembers(todayPeople);

        /*
         * Today's statistics
         *
         * Present = on-time present only.
         * Late gets its own category.
         */

        setStats({
            totalMembers: members.length,
            present: todayPeople.present.length,
            late: todayPeople.late.length,
            earlyLeave:
                todayPeople.earlyLeave.length,
            inattentive:
                todayPeople.inattentive.length,
            absent: todayPeople.absent.length,
        });

        /*
         * Weekly leaderboard
         */

        const memberStats = {};

        members.forEach((member) => {
            memberStats[member.id] = {
                id: member.id,
                full_name: member.full_name,
                present: 0,
                absent: 0,
            };
        });

        weeklyAttendance.forEach((record) => {
            const member =
                memberStats[record.member_id];

            if (!member) {
                return;
            }

            // Present + Late = attended
            if (
                record.status === "present"
            ) {
                member.present += 1;
            }

            // Absent + Early Leave + Inattentive
            if (
                record.status === "absent"
            ) {
                member.absent += 1;
            }
        });

        setLeaderboard(
            Object.values(memberStats)
        );

        setLoading(false);
    }

    function getSelectedPeople() {
        if (!selectedStat) {
            return [];
        }

        return todayMembers[selectedStat] ?? [];
    }

    function getSelectedTitle() {
        switch (selectedStat) {
            case "total":
                return "All Members";

            case "present":
                return "Present Today";

            case "late":
                return "Late Today";

            case "earlyLeave":
                return "Early Leave Today";

            case "inattentive":
                return "Inattentive Today";

            case "absent":
                return "Absent Today";

            default:
                return "";
        }
    }

    const sortedLeaderboard = [
        ...leaderboard,
    ].sort((a, b) => {
        if (
            leaderboardMode ===
            "present"
        ) {
            if (
                b.present !==
                a.present
            ) {
                return (
                    b.present -
                    a.present
                );
            }

            return a.full_name.localeCompare(
                b.full_name
            );
        }

        if (
            b.absent !==
            a.absent
        ) {
            return (
                b.absent -
                a.absent
            );
        }

        return a.full_name.localeCompare(
            b.full_name
        );
    });

    function renderStatCard(
        label,
        value,
        statKey
    ) {
        return (
            <button
                type="button"
                className="stat-card"
                onClick={() =>
                    setSelectedStat(
                        statKey
                    )
                }
                disabled={loading}
            >
                <span className="stat-label">
                    {label}
                </span>

                <strong className="stat-value">
                    {loading
                        ? "—"
                        : value}
                </strong>

                {!loading && (
                    <span className="stat-card-hint">
                        Click to view
                    </span>
                )}
            </button>
        );
    }

    return (
        <section className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>

                    <p>
                        Overview of today's
                        attendance.
                    </p>
                </div>

                <button
                    className="refresh-button"
                    onClick={
                        loadDashboardStats
                    }
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
                {renderStatCard(
                    "Total Members",
                    stats.totalMembers,
                    "total"
                )}

                {renderStatCard(
                    "Present Today",
                    stats.present,
                    "present"
                )}

                {renderStatCard(
                    "Late Today",
                    stats.late,
                    "late"
                )}

                {renderStatCard(
                    "Early Leave",
                    stats.earlyLeave,
                    "earlyLeave"
                )}

                {renderStatCard(
                    "Inattentive Today",
                    stats.inattentive,
                    "inattentive"
                )}

                {renderStatCard(
                    "Absent Today",
                    stats.absent,
                    "absent"
                )}
            </div>

            {/* Weekly Leaderboard */}

            <div className="leaderboard-card">
                <div className="leaderboard-header">
                    <div>
                        <h2>
                            Weekly Leaderboard
                        </h2>

                        <p>
                            Attendance performance
                            this week.
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
                ) : sortedLeaderboard.length ===
                  0 ? (
                    <div className="leaderboard-empty">
                        No members have been
                        added yet.
                    </div>
                ) : (
                    <div className="leaderboard-list">
                        {sortedLeaderboard.map(
                            (
                                member,
                                index
                            ) => {
                                const count =
                                    leaderboardMode ===
                                    "present"
                                        ? member.present
                                        : member.absent;

                                return (
                                    <div
                                        className="leaderboard-row"
                                        key={
                                            member.id
                                        }
                                    >
                                        <div className="leaderboard-rank">
                                            {index +
                                                1}
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
                                                {
                                                    count
                                                }
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

            {/* Today's Attendance */}

            <div className="dashboard-section">
                <h2>
                    Today's Attendance
                </h2>

                {loading ? (
                    <p>
                        Loading attendance...
                    </p>
                ) : (
                    <p>
                        {todayAttendanceMessage(
                            stats
                        )}
                    </p>
                )}
            </div>

            {/* Member List Modal */}

            {selectedStat && (
                <div
                    className="stat-modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setSelectedStat(
                                null
                            );
                        }
                    }}
                >
                    <div className="stat-modal">
                        <div className="stat-modal-header">
                            <div>
                                <h2>
                                    {getSelectedTitle()}
                                </h2>

                                <p>
                                    {getSelectedPeople()
                                        .length}{" "}
                                    {getSelectedPeople()
                                        .length ===
                                    1
                                        ? "member"
                                        : "members"}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="stat-modal-close"
                                onClick={() =>
                                    setSelectedStat(
                                        null
                                    )
                                }
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <div className="stat-member-list">
                            {getSelectedPeople()
                                .length ===
                            0 ? (
                                <div className="stat-member-empty">
                                    Nobody is in this
                                    category today.
                                </div>
                            ) : (
                                getSelectedPeople().map(
                                    (member) => (
                                        <div
                                            className="stat-member-row"
                                            key={
                                                member.id
                                            }
                                        >
                                            <div className="stat-member-avatar">
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
                                    )
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function todayAttendanceMessage(
    stats
) {
    const total =
        stats.present +
        stats.late +
        stats.earlyLeave +
        stats.inattentive +
        stats.absent;

    return `${total} attendance ${
        total === 1
            ? "record"
            : "records"
    } have been recorded today.`;
}

export default AdminDashboard;