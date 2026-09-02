import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Attendance.css";

function getDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString("en-CA");
}

function formatDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function Attendance() {
    const [selectedDate, setSelectedDate] = useState(getDate());
    const [members, setMembers] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [editingId, setEditingId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [error, setError] = useState("");

    const today = getDate();
    const yesterday = getDate(-1);

    const isPastDate = selectedDate < today;
    const canEdit =
        selectedDate === today || selectedDate === yesterday;

    useEffect(() => {
        loadAttendance();
    }, [selectedDate]);

    async function loadAttendance() {
        setLoading(true);
        setError("");
        setEditingId(null);

        const { data: membersData, error: membersError } =
            await supabase
                .from("profiles")
                .select("id, full_name")
                .eq("role", "member")
                .order("full_name");

        if (membersError) {
            console.error(membersError);
            setError("Unable to load members.");
            setLoading(false);
            return;
        }

        const { data: attendanceData, error: attendanceError } =
            await supabase
                .from("attendance")
                .select("*")
                .eq("attendance_date", selectedDate);

        if (attendanceError) {
            console.error(attendanceError);
            setError("Unable to load attendance.");
            setLoading(false);
            return;
        }

        setMembers(membersData ?? []);
        setAttendance(attendanceData ?? []);
        setLoading(false);
    }

    function getAttendance(memberId) {
        return attendance.find(
            (record) => record.member_id === memberId
        );
    }

    async function saveAttendance(
        memberId,
        status,
        isLate,
        earlyLeave
    ) {
        setSavingId(memberId);
        setError("");

        const { data, error } = await supabase
            .from("attendance")
            .upsert(
                {
                    member_id: memberId,
                    attendance_date: selectedDate,
                    status,
                    is_late: isLate,
                    early_leave: earlyLeave,
                },
                {
                    onConflict: "member_id,attendance_date",
                }
            )
            .select()
            .single();

        if (error) {
            console.error(error);
            setError("Unable to save attendance.");
            setSavingId(null);
            return;
        }

        setAttendance((current) => {
            const exists = current.some(
                (record) => record.member_id === memberId
            );

            if (exists) {
                return current.map((record) =>
                    record.member_id === memberId
                        ? data
                        : record
                );
            }

            return [...current, data];
        });

        setEditingId(null);
        setSavingId(null);
    }

    async function markPresent(memberId) {
        await saveAttendance(
            memberId,
            "present",
            false,
            false
        );
    }

    async function markAbsent(memberId) {
        await saveAttendance(
            memberId,
            "absent",
            false,
            false
        );
    }

    async function markLate(memberId) {
        await saveAttendance(
            memberId,
            "present",
            true,
            false
        );
    }

    async function markEarlyLeave(memberId, record) {
        await saveAttendance(
            memberId,
            "absent",
            record?.is_late ?? false,
            true
        );
    }

    function getStatus(record) {
        if (!record) {
            if (isPastDate) {
                return {
                    label: "Forgotten",
                    className: "status-forgotten",
                };
            }

            return {
                label: "Not Marked",
                className: "status-not-marked",
            };
        }

        if (record.early_leave) {
            return {
                label: "Early Leave",
                className: "status-early-leave",
            };
        }

        if (record.status === "present" && record.is_late) {
            return {
                label: "Late",
                className: "status-late",
            };
        }

        if (record.status === "present") {
            return {
                label: "Present",
                className: "status-present",
            };
        }

        return {
            label: "Absent",
            className: "status-absent",
        };
    }

    function renderEditActions(member, record, saving) {
        return (
            <div className="attendance-actions">
                <button
                    className="action-button present-button"
                    onClick={() => markPresent(member.id)}
                    disabled={saving}
                >
                    Present
                </button>

                <button
                    className="action-button absent-button"
                    onClick={() => markAbsent(member.id)}
                    disabled={saving}
                >
                    Absent
                </button>

                <button
                    className="action-button late-button"
                    onClick={() => markLate(member.id)}
                    disabled={saving}
                >
                    Late
                </button>

                <button
                    className="action-button early-button"
                    onClick={() =>
                        markEarlyLeave(member.id, record)
                    }
                    disabled={saving}
                >
                    Early Leave
                </button>

                <button
                    className="action-button cancel-button"
                    onClick={() => setEditingId(null)}
                    disabled={saving}
                >
                    Cancel
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <section className="attendance-page">
                <div className="attendance-loading">
                    Loading attendance...
                </div>
            </section>
        );
    }

    return (
        <section className="attendance-page">
            <div className="attendance-header">
                <div>
                    <h1>Attendance</h1>
                    <p>Manage attendance records.</p>
                </div>

                <div className="attendance-date">
                    {formatDate(selectedDate)}
                </div>
            </div>

            <div className="attendance-date-selector">
                <button
                    className={
                        selectedDate === today
                            ? "date-button active"
                            : "date-button"
                    }
                    onClick={() => setSelectedDate(today)}
                >
                    Today
                </button>

                <button
                    className={
                        selectedDate === yesterday
                            ? "date-button active"
                            : "date-button"
                    }
                    onClick={() => setSelectedDate(yesterday)}
                >
                    Yesterday
                </button>
            </div>

            {!canEdit && (
                <div className="attendance-info">
                    Older attendance records are view-only.
                </div>
            )}

            {error && (
                <div className="attendance-error">
                    {error}
                </div>
            )}

            <div className="attendance-table-wrapper">
                <div className="attendance-table-header">
                    <span>Member</span>
                    <span>Status</span>
                    <span>Actions</span>
                </div>

                {members.length === 0 ? (
                    <div className="attendance-empty">
                        No members found.
                    </div>
                ) : (
                    members.map((member) => {
                        const record = getAttendance(member.id);
                        const status = getStatus(record);
                        const saving = savingId === member.id;
                        const editing =
                            editingId === member.id;

                        return (
                            <div
                                className="attendance-row"
                                key={member.id}
                            >
                                <div className="member-name">
                                    {member.full_name}
                                </div>

                                <div>
                                    <span
                                        className={`status-badge ${status.className}`}
                                    >
                                        <span className="status-dot" />
                                        {status.label}
                                    </span>
                                </div>

                                <div className="attendance-actions">
                                    {!record && canEdit ? (
                                        <>
                                            <button
                                                className="action-button present-button"
                                                onClick={() =>
                                                    markPresent(
                                                        member.id
                                                    )
                                                }
                                                disabled={saving}
                                            >
                                                Present
                                            </button>

                                            <button
                                                className="action-button absent-button"
                                                onClick={() =>
                                                    markAbsent(
                                                        member.id
                                                    )
                                                }
                                                disabled={saving}
                                            >
                                                Absent
                                            </button>
                                        </>
                                    ) : record && editing && canEdit ? (
                                        renderEditActions(
                                            member,
                                            record,
                                            saving
                                        )
                                    ) : record && canEdit ? (
                                        <button
                                            className="action-button edit-button"
                                            onClick={() =>
                                                setEditingId(
                                                    member.id
                                                )
                                            }
                                            disabled={saving}
                                        >
                                            Edit
                                        </button>
                                    ) : (
                                        <span className="locked-label">
                                            {record
                                                ? "View only"
                                                : "No record"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}

export default Attendance;