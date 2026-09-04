import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./Members.css";

function getDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    return date.toISOString().split("T")[0];
}

function Members() {
    const navigate = useNavigate();

    const [members, setMembers] = useState([]);
    const [streaks, setStreaks] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [fullName, setFullName] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadMembers();
    }, []);

    async function loadMembers() {
        setLoading(true);
        setError("");

        const {
            data: membersData,
            error: membersError,
        } = await supabase
            .from("profiles")
            .select("id, full_name, created_at")
            .eq("role", "member")
            .order("full_name", { ascending: true });

        if (membersError) {
            console.error(membersError);
            setError("Unable to load members.");
            setLoading(false);
            return;
        }

        const membersList = membersData ?? [];

        setMembers(membersList);

        if (membersList.length === 0) {
            setStreaks({});
            setLoading(false);
            return;
        }

        const {
            data: attendanceData,
            error: attendanceError,
        } = await supabase
            .from("attendance")
            .select(
                "member_id, attendance_date, status"
            )
            .in(
                "member_id",
                membersList.map((member) => member.id)
            )
            .order("attendance_date", {
                ascending: false,
            });

        if (attendanceError) {
            console.error(attendanceError);
            setError("Unable to load member streaks.");
            setLoading(false);
            return;
        }

        const calculatedStreaks = {};

        membersList.forEach((member) => {
            calculatedStreaks[member.id] =
                calculateCurrentStreak(
                    attendanceData ?? [],
                    member.id
                );
        });

        setStreaks(calculatedStreaks);
        setLoading(false);
    }

    function calculateCurrentStreak(records, memberId) {
        const memberRecords = records
            .filter(
                (record) =>
                    record.member_id === memberId &&
                    record.status === "present"
            )
            .sort((a, b) =>
                b.attendance_date.localeCompare(
                    a.attendance_date
                )
            );

        if (memberRecords.length === 0) {
            return 0;
        }

        const attendanceDates = new Set(
            memberRecords.map(
                (record) => record.attendance_date
            )
        );

        let streak = 0;
        let currentDate = new Date();

        // If today hasn't been marked yet, start from yesterday.
        const today = getDate();

        if (!attendanceDates.has(today)) {
            currentDate.setDate(
                currentDate.getDate() - 1
            );
        }

        while (true) {
            const dateString =
                currentDate.toISOString().split("T")[0];

            if (!attendanceDates.has(dateString)) {
                break;
            }

            streak += 1;

            currentDate.setDate(
                currentDate.getDate() - 1
            );
        }

        return streak;
    }

    function openAddModal() {
        setFullName("");
        setError("");
        setShowModal(true);
    }

    function closeAddModal() {
        if (saving) return;

        setShowModal(false);
        setFullName("");
    }

    async function handleAddMember(e) {
        e.preventDefault();

        const trimmedName = fullName.trim();

        if (!trimmedName) {
            return;
        }

        setSaving(true);
        setError("");

        const { data, error } = await supabase
            .from("profiles")
            .insert({
                full_name: trimmedName,
                role: "member",
            })
            .select("id, full_name, created_at")
            .single();

        if (error) {
            console.error(error);
            setError("Unable to add member.");
            setSaving(false);
            return;
        }

        setMembers((current) =>
            [...current, data].sort((a, b) =>
                a.full_name.localeCompare(
                    b.full_name,
                    undefined,
                    { sensitivity: "base" }
                )
            )
        );

        setStreaks((current) => ({
            ...current,
            [data.id]: 0,
        }));

        setFullName("");
        setShowModal(false);
        setSaving(false);
    }

    async function handleDeleteMember(member) {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${member.full_name}?`
        );

        if (!confirmed) {
            return;
        }

        setError("");

        const { error } = await supabase
            .from("profiles")
            .delete()
            .eq("id", member.id);

        if (error) {
            console.error(error);
            setError("Unable to delete member.");
            return;
        }

        setMembers((current) =>
            current.filter(
                (item) => item.id !== member.id
            )
        );

        setStreaks((current) => {
            const updated = { ...current };
            delete updated[member.id];
            return updated;
        });
    }

    function openMember(memberId) {
        navigate(`/admin/members/${memberId}`);
    }

    return (
        <div className="members-page">
            <div className="members-header">
                <div>
                    <h1>Members</h1>
                    <p>
                        Manage the members in your attendance
                        system.
                    </p>
                </div>

                <button
                    className="add-member-button"
                    type="button"
                    onClick={openAddModal}
                >
                    + Add Member
                </button>
            </div>

            {error && (
                <div className="members-error">
                    {error}
                </div>
            )}

            <div className="members-table">
                <div className="members-table-header">
                    <span>Member</span>
                    <span>Joined</span>
                    <span>Current Streak</span>
                    <span>Actions</span>
                </div>

                {loading ? (
                    <div className="members-loading">
                        Loading members...
                    </div>
                ) : members.length === 0 ? (
                    <div className="members-empty">
                        No members have been added yet.
                    </div>
                ) : (
                    members.map((member) => (
                        <div
                            className="member-row"
                            key={member.id}
                        >
                            <button
                                className="member-info member-details-link"
                                type="button"
                                onClick={() =>
                                    openMember(member.id)
                                }
                            >
                                <div className="member-avatar">
                                    {member.full_name
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>

                                <strong>
                                    {member.full_name}
                                </strong>
                            </button>

                            <span className="member-joined">
                                {new Date(
                                    member.created_at
                                ).toLocaleDateString()}
                            </span>

                            <span className="member-streak">
                                🔥{" "}
                                <strong>
                                    {streaks[member.id] ?? 0}
                                </strong>{" "}
                                {streaks[member.id] === 1
                                    ? "day"
                                    : "days"}
                            </span>

                            <div className="member-actions">
                                <button
                                    className="delete-button"
                                    type="button"
                                    onClick={() =>
                                        handleDeleteMember(
                                            member
                                        )
                                    }
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div
                    className="modal-overlay"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            closeAddModal();
                        }
                    }}
                >
                    <div className="member-modal">
                        <div className="modal-header">
                            <div>
                                <h2>Add Member</h2>
                                <p>
                                    Add a new member to the
                                    system.
                                </p>
                            </div>

                            <button
                                className="modal-close"
                                type="button"
                                onClick={closeAddModal}
                                disabled={saving}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <form
                            className="member-form"
                            onSubmit={handleAddMember}
                        >
                            <label>
                                Full Name

                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) =>
                                        setFullName(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter member name"
                                    autoFocus
                                    autoComplete="off"
                                    disabled={saving}
                                    required
                                />
                            </label>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="modal-cancel"
                                    onClick={
                                        closeAddModal
                                    }
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="modal-submit"
                                    disabled={
                                        saving ||
                                        !fullName.trim()
                                    }
                                >
                                    {saving
                                        ? "Adding..."
                                        : "Add Member"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Members;