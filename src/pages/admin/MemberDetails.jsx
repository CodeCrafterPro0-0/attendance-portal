import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./MemberDetails.css";

function formatDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function getStatus(record) {
    if (record.inattentive) {
        return "inattentive";
    }

    if (record.early_leave) {
        return "early_leave";
    }

    if (record.status === "present" && record.is_late) {
        return "late";
    }

    if (record.status === "present") {
        return "present";
    }

    if (record.status === "absent") {
        return "absent";
    }

    return "absent";
}

function getStatusLabel(status) {
    switch (status) {
        case "present":
            return "Present";

        case "late":
            return "Late";

        case "early_leave":
            return "Early Leave";

        case "inattentive":
            return "Inattentive";

        case "absent":
            return "Absent";

        default:
            return "Absent";
    }
}

function calculateCurrentStreak(records) {
    const attendedDates = new Set(
        records
            .filter(
                (record) =>
                    record.status === "present"
            )
            .map(
                (record) =>
                    record.attendance_date
            )
    );

    if (attendedDates.size === 0) {
        return 0;
    }

    const today = new Date();
    const todayString =
        today.toISOString().split("T")[0];

    let currentDate = new Date();

    // If today hasn't been marked yet,
    // start checking from yesterday.
    if (!attendedDates.has(todayString)) {
        currentDate.setDate(
            currentDate.getDate() - 1
        );
    }

    let streak = 0;

    while (true) {
        const dateString =
            currentDate.toISOString().split("T")[0];

        if (!attendedDates.has(dateString)) {
            break;
        }

        streak += 1;

        currentDate.setDate(
            currentDate.getDate() - 1
        );
    }

    return streak;
}

function MemberDetails() {
    const { memberId } = useParams();
    const navigate = useNavigate();

    const [member, setMember] = useState(null);
    const [attendance, setAttendance] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadMemberDetails();
    }, [memberId]);

    async function loadMemberDetails() {
        setLoading(true);
        setError("");

        const {
            data: memberData,
            error: memberError,
        } = await supabase
            .from("profiles")
            .select(
                "id, full_name, created_at"
            )
            .eq("id", memberId)
            .eq("role", "member")
            .single();

        if (memberError) {
            console.error(memberError);
            setError("Unable to load member.");
            setLoading(false);
            return;
        }

        const {
            data: attendanceData,
            error: attendanceError,
        } = await supabase
            .from("attendance")
            .select(
                "id, attendance_date, status, is_late, early_leave, inattentive"
            )
            .eq("member_id", memberId)
            .order("attendance_date", {
                ascending: false,
            });

        if (attendanceError) {
            console.error(attendanceError);
            setError(
                "Unable to load attendance history."
            );
            setLoading(false);
            return;
        }

        setMember(memberData);
        setAttendance(attendanceData ?? []);
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="member-details-page">
                <div className="member-details-loading">
                    Loading member...
                </div>
            </div>
        );
    }

    if (error || !member) {
        return (
            <div className="member-details-page">
                <button
                    className="back-button"
                    type="button"
                    onClick={() =>
                        navigate("/admin/members")
                    }
                >
                    ← Back to Members
                </button>

                <div className="member-details-error">
                    {error || "Member not found."}
                </div>
            </div>
        );
    }

    const present = attendance.filter(
        (record) =>
            record.status === "present" &&
            !record.is_late
    ).length;

    const late = attendance.filter(
        (record) =>
            record.status === "present" &&
            record.is_late
    ).length;

    const earlyLeave = attendance.filter(
        (record) =>
            record.status === "absent" &&
            record.early_leave
    ).length;

    const inattentive = attendance.filter(
        (record) =>
            record.status === "absent" &&
            record.inattentive
    ).length;

    const absent = attendance.filter(
        (record) =>
            record.status === "absent" &&
            !record.early_leave &&
            !record.inattentive
    ).length;

    const attended = present + late;

    const totalMarked =
        attended +
        earlyLeave +
        inattentive +
        absent;

    const attendancePercentage =
        totalMarked > 0
            ? Math.round(
                  (attended / totalMarked) * 100
              )
            : 0;

    const currentStreak =
        calculateCurrentStreak(attendance);

    return (
        <div className="member-details-page">
            {/* Back */}

            <button
                className="back-button"
                type="button"
                onClick={() =>
                    navigate("/admin/members")
                }
            >
                ← Back to Members
            </button>

            {/* Profile header */}

            <div className="member-profile-card">
                <div className="member-profile-main">
                    <div className="member-profile-avatar">
                        {member.full_name
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div>
                        <h1>{member.full_name}</h1>

                        <p>
                            Joined{" "}
                            {new Date(
                                member.created_at
                            ).toLocaleDateString(
                                undefined,
                                {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                }
                            )}
                        </p>
                    </div>
                </div>

                <div className="current-streak">
                    <span>🔥</span>

                    <div>
                        <strong>
                            {currentStreak}
                        </strong>

                        <small>
                            {currentStreak === 1
                                ? "day streak"
                                : "days streak"}
                        </small>
                    </div>
                </div>
            </div>

            {/* Statistics */}

            <div className="member-stat-grid">
                <div className="member-stat-card">
                    <span>Attendance</span>

                    <strong>
                        {attendancePercentage}%
                    </strong>
                </div>

                <div className="member-stat-card">
                    <span>Present</span>

                    <strong>{present}</strong>
                </div>

                <div className="member-stat-card">
                    <span>Late</span>

                    <strong>{late}</strong>
                </div>

                <div className="member-stat-card">
                    <span>Absent</span>

                    <strong>{absent}</strong>
                </div>

                <div className="member-stat-card">
                    <span>Early Leave</span>

                    <strong>{earlyLeave}</strong>
                </div>

                <div className="member-stat-card">
                    <span>Inattentive</span>

                    <strong>{inattentive}</strong>
                </div>
            </div>

            {/* History */}

            <div className="member-history-card">
                <div className="member-history-header">
                    <div>
                        <h2>Attendance History</h2>

                        <p>
                            Complete attendance record
                            for this member.
                        </p>
                    </div>
                </div>

                {attendance.length === 0 ? (
                    <div className="member-history-empty">
                        No attendance records yet.
                    </div>
                ) : (
                    <div className="member-history-table">
                        <div className="member-history-table-header">
                            <span>Date</span>
                            <span>Status</span>
                        </div>

                        {attendance.map((record) => {
                            const status =
                                getStatus(record);

                            return (
                                <div
                                    className="member-history-row"
                                    key={record.id}
                                >
                                    <span className="history-date">
                                        {formatDate(
                                            record.attendance_date
                                        )}
                                    </span>

                                    <span
                                        className={`history-status ${status}`}
                                    >
                                        {getStatusLabel(
                                            status
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MemberDetails;