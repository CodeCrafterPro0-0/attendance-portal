import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import "./MemberDashboard.css";

function MemberDashboard() {
    const { user, profile, signOut } = useAuth();

    const navigate = useNavigate();

    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(
        today.getMonth() + 1
    ).padStart(2, "0")}`;

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    const monthOptions = useMemo(() => {
        const months = [];

        for (let i = 0; i < 12; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);

            months.push({
                value: `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}`,
                label: date.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                }),
            });
        }

        return months;
    }, []);

    const monthlyHistory = useMemo(() => {
        const [year, month] = selectedMonth.split("-").map(Number);

        const daysInMonth = new Date(year, month, 0).getDate();

        const attendanceMap = new Map(
            attendance.map((record) => [
                record.attendance_date,
                record,
            ])
        );

        const todayString = new Date().toLocaleDateString("en-CA");

        return Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;

            const date = `${year}-${String(month).padStart(
                2,
                "0"
            )}-${String(day).padStart(2, "0")}`;

            const record = attendanceMap.get(date);

            let status = "Not Marked";

            if (record) {
                if (record.status === "present" && record.is_late) {
                    status = "Late";
                } else if (
                    record.status === "absent" &&
                    record.early_leave
                ) {
                    status = "Early Leave";
                } else if (record.status === "present") {
                    status = "Present";
                } else if (record.status === "forgotten") {
                    status = "Forgotten";
                } else {
                    status = "Absent";
                }
            } else if (date < todayString) {
                status = "Forgotten";
            }

            return {
                date,
                day,
                status,
            };
        });
    }, [attendance, selectedMonth]);

    useEffect(() => {
        if (user) {
            loadAttendance();
        }
    }, [user]);

    async function loadAttendance() {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
            .from("attendance")
            .select("*")
            .eq("member_id", user.id)
            .order("attendance_date", { ascending: false });

        if (error) {
            console.error(error);
            setError("Unable to load your attendance.");
            setLoading(false);
            return;
        }

        setAttendance(data ?? []);
        setLoading(false);
    }

    async function handleLogout() {
        await signOut();
        navigate("/login", { replace: true });
    }

    if (loading) {
        return <p>Loading...</p>;
    }

    const totalAttendanceDays = attendance.length;

    const attendedDays = attendance.filter(
        (record) => record.status === "present"
    ).length;

    const attendancePercentage =
        totalAttendanceDays === 0
            ? 0
            : ((attendedDays / totalAttendanceDays) * 100).toFixed(1);

    return (
        <main className="member-dashboard">
            <header className="member-dashboard-header">
                <div>
                    <h1>Welcome, {profile?.full_name}</h1>
                    <p>Here's your attendance overview.</p>
                </div>

                <button
                    className="member-logout-button"
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </header>

            {error && (
                <div className="member-dashboard-error">
                    {error}
                </div>
            )}

            <section className="member-attendance-card">
                <span className="member-attendance-label">
                    Attendance
                </span>

                <strong className="member-attendance-percentage">
                    {attendancePercentage}%
                </strong>

                <p>
                    {attendedDays} of {totalAttendanceDays} days attended
                </p>
            </section>

            <section className="member-history-section">
                <div className="member-history-header">
                    <h2>Attendance History</h2>

                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        {monthOptions.map((month) => (
                            <option
                                key={month.value}
                                value={month.value}
                            >
                                {month.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="member-history-list">
                    {monthlyHistory.map((record) => (
                        <div
                            className="member-history-row"
                            key={record.date}
                        >
                            <div className="member-history-date">
                                <strong>{record.day}</strong>

                                <span>
                                    {new Date(
                                        `${record.date}T00:00:00`
                                    ).toLocaleDateString("en-US", {
                                        weekday: "short",
                                    })}
                                </span>
                            </div>

                            <span
                                className={`member-history-status status-${record.status
                                    .toLowerCase()
                                    .replace(" ", "-")}`}
                            >
                                {record.status}
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}

export default MemberDashboard;