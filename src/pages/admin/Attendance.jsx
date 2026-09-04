import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Attendance.css";

function getDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    return date.toISOString().split("T")[0];
}

function formatDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function Attendance() {
    const today = getDate();

    const [selectedDate, setSelectedDate] = useState(today);
    const [members, setMembers] = useState([]);
    const [attendance, setAttendance] = useState([]);

    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [error, setError] = useState("");

    const [editingId, setEditingId] = useState(null);

    const canEdit = selectedDate <= today;
    const isPastDate = selectedDate < today;

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    async function loadData() {
        setLoading(true);
        setError("");
        setEditingId(null);

        const [
            { data: membersData, error: membersError },
            { data: attendanceData, error: attendanceError },
        ] = await Promise.all([
            supabase
                .from("profiles")
                .select("id, full_name")
                .eq("role", "member")
                .order("created_at", { ascending: true }),

            supabase
                .from("attendance")
                .select(
                    "id, member_id, attendance_date, status, is_late, early_leave, inattentive"
                )
                .eq("attendance_date", selectedDate),
        ]);

        if (membersError) {
            console.error(membersError);
            setError("Unable to load members.");
            setLoading(false);
            return;
        }

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

    function getAttendanceRecord(memberId) {
        return attendance.find(
            (record) => record.member_id === memberId
        );
    }

    function getStatus(memberId) {
        const record = getAttendanceRecord(memberId);

        if (!record) {
            if (isPastDate) {
                return "forgotten";
            }

            return "not_marked";
        }

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

        return "not_marked";
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

            case "forgotten":
                return "Forgotten";

            case "not_marked":
                return "Not Marked";

            default:
                return "Not Marked";
        }
    }

    async function saveAttendance(
        memberId,
        status,
        options = {}
    ) {
        if (!canEdit) {
            return;
        }

        setSavingId(memberId);
        setError("");

        const isLate = options.isLate ?? false;
        const earlyLeave = options.earlyLeave ?? false;
        const inattentive = options.inattentive ?? false;

        let dbStatus = "absent";

        if (status === "present" || status === "late") {
            dbStatus = "present";
        }

        const { data, error } = await supabase
            .from("attendance")
            .upsert(
                {
                    member_id: memberId,
                    attendance_date: selectedDate,
                    status: dbStatus,
                    is_late: isLate,
                    early_leave: earlyLeave,
                    inattentive: inattentive,
                },
                {
                    onConflict:
                        "member_id,attendance_date",
                }
            )
            .select(
                "id, member_id, attendance_date, status, is_late, early_leave, inattentive"
            )
            .single();

        if (error) {
            console.error(error);
            setError("Unable to save attendance.");
            setSavingId(null);
            return;
        }

        setAttendance((current) => {
            const existingIndex = current.findIndex(
                (record) => record.member_id === memberId
            );

            if (existingIndex === -1) {
                return [...current, data];
            }

            return current.map((record, index) =>
                index === existingIndex ? data : record
            );
        });

        setEditingId(null);
        setSavingId(null);
    }

    function markPresent(memberId) {
        saveAttendance(memberId, "present", {
            isLate: false,
            earlyLeave: false,
            inattentive: false,
        });
    }

    function markAbsent(memberId) {
        saveAttendance(memberId, "absent", {
            isLate: false,
            earlyLeave: false,
            inattentive: false,
        });
    }

    function markLate(memberId) {
        saveAttendance(memberId, "late", {
            isLate: true,
            earlyLeave: false,
            inattentive: false,
        });
    }

    function markEarlyLeave(memberId) {
        saveAttendance(memberId, "early_leave", {
            isLate: false,
            earlyLeave: true,
            inattentive: false,
        });
    }

    function markInattentive(memberId) {
        saveAttendance(memberId, "inattentive", {
            isLate: false,
            earlyLeave: false,
            inattentive: true,
        });
    }

    function renderActions(member) {
        const memberId = member.id;
        const status = getStatus(memberId);
        const saving = savingId === memberId;

        if (!canEdit) {
            return (
                <span className="attendance-view-only">
                    View only
                </span>
            );
        }

        if (editingId === memberId) {
            return (
                <div className="attendance-edit-actions">
                    <button
                        type="button"
                        className="attendance-action present"
                        onClick={() => markPresent(memberId)}
                        disabled={saving}
                    >
                        Present
                    </button>

                    <button
                        type="button"
                        className="attendance-action absent"
                        onClick={() => markAbsent(memberId)}
                        disabled={saving}
                    >
                        Absent
                    </button>

                    <button
                        type="button"
                        className="attendance-action late"
                        onClick={() => markLate(memberId)}
                        disabled={saving}
                    >
                        Late
                    </button>

                    <button
                        type="button"
                        className="attendance-action early-leave"
                        onClick={() =>
                            markEarlyLeave(memberId)
                        }
                        disabled={saving}
                    >
                        Early Leave
                    </button>

                    <button
                        type="button"
                        className="attendance-action inattentive"
                        onClick={() =>
                            markInattentive(memberId)
                        }
                        disabled={saving}
                    >
                        Inattentive
                    </button>

                    <button
                        type="button"
                        className="attendance-action cancel"
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                </div>
            );
        }

        if (status === "not_marked") {
            return (
                <div className="attendance-actions">
                    <button
                        type="button"
                        className="attendance-action present"
                        onClick={() => markPresent(memberId)}
                        disabled={saving}
                    >
                        Present
                    </button>

                    <button
                        type="button"
                        className="attendance-action absent"
                        onClick={() => markAbsent(memberId)}
                        disabled={saving}
                    >
                        Absent
                    </button>
                </div>
            );
        }

        if (status === "forgotten") {
            return (
                <div className="attendance-actions">
                    <button
                        type="button"
                        className="attendance-action edit"
                        onClick={() => setEditingId(memberId)}
                        disabled={saving}
                    >
                        Mark
                    </button>
                </div>
            );
        }

        return (
            <div className="attendance-actions">
                <button
                    type="button"
                    className="attendance-action edit"
                    onClick={() => setEditingId(memberId)}
                    disabled={saving}
                >
                    Edit
                </button>
            </div>
        );
    }

    return (
        <div className="attendance-page">
            <div className="attendance-header">
                <div>
                    <h1>Attendance</h1>

                    <p>
                        Manage attendance for each member.
                    </p>
                </div>

                <div className="attendance-date-selector">
                    <button
                        type="button"
                        className={
                            selectedDate === today
                                ? "date-button active"
                                : "date-button"
                        }
                        onClick={() =>
                            setSelectedDate(today)
                        }
                    >
                        Today
                    </button>

                    <button
                        type="button"
                        className={
                            selectedDate === getDate(-1)
                                ? "date-button active"
                                : "date-button"
                        }
                        onClick={() =>
                            setSelectedDate(getDate(-1))
                        }
                    >
                        Yesterday
                    </button>

                    <input
                        className="attendance-date-picker"
                        type="date"
                        value={selectedDate}
                        max={today}
                        onChange={(e) =>
                            setSelectedDate(e.target.value)
                        }
                    />
                </div>
            </div>

            <div className="attendance-date-info">
                <strong>
                    {formatDate(selectedDate)}
                </strong>

                {canEdit ? (
                    <span>
                        You can edit attendance for this date.
                    </span>
                ) : (
                    <span>
                        Future attendance cannot be marked.
                    </span>
                )}
            </div>

            {error && (
                <div className="attendance-error">
                    {error}
                </div>
            )}

            <div className="attendance-table">
                <div className="attendance-table-header">
                    <span>Member</span>
                    <span>Status</span>
                    <span>Actions</span>
                </div>

                {loading ? (
                    <div className="attendance-loading">
                        Loading attendance...
                    </div>
                ) : members.length === 0 ? (
                    <div className="attendance-empty">
                        No members have been added yet.
                    </div>
                ) : (
                    members.map((member) => {
                        const status = getStatus(member.id);

                        return (
                            <div
                                className="attendance-row"
                                key={member.id}
                            >
                                <div className="attendance-member">
                                    <div className="attendance-avatar">
                                        {member.full_name
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <strong>
                                        {member.full_name}
                                    </strong>
                                </div>

                                <div className="attendance-status">
                                    <span
                                        className={`status-badge ${status}`}
                                    >
                                        {getStatusLabel(status)}
                                    </span>
                                </div>

                                <div className="attendance-actions-container">
                                    {renderActions(member)}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default Attendance;