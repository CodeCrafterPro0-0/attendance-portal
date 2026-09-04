import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Members.css";

function Members() {
    const [members, setMembers] = useState([]);
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

        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, created_at")
            .eq("role", "member")
            .order("created_at", { ascending: true });

        if (error) {
            console.error(error);
            setError("Unable to load members.");
            setLoading(false);
            return;
        }

        setMembers(data ?? []);
        setLoading(false);
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

        setMembers((current) => [...current, data]);
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
            current.filter((item) => item.id !== member.id)
        );
    }

    return (
        <div className="members-page">
            <div className="members-header">
                <div>
                    <h1>Members</h1>
                    <p>Manage the members in your attendance system.</p>
                </div>

                <button
                    className="add-member-button"
                    onClick={() => setShowModal(true)}
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
                            <div className="member-info">
                                <div className="member-avatar">
                                    {member.full_name
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>

                                <div>
                                    <strong>{member.full_name}</strong>
                                </div>
                            </div>

                            <span className="member-joined">
                                {new Date(
                                    member.created_at
                                ).toLocaleDateString()}
                            </span>

                            <div className="member-actions">
                                <button
                                    className="view-button"
                                    type="button"
                                >
                                    View
                                </button>

                                <button
                                    className="delete-button"
                                    type="button"
                                    onClick={() =>
                                        handleDeleteMember(member)
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
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="member-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div>
                                <h2>Add Member</h2>
                                <p>Add a new member to the system.</p>
                            </div>

                            <button
                                className="modal-close"
                                type="button"
                                onClick={() =>
                                    setShowModal(false)
                                }
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleAddMember}>
                            <label className="modal-field">
                                Full Name
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) =>
                                        setFullName(e.target.value)
                                    }
                                    placeholder="Enter member name"
                                    autoFocus
                                    disabled={saving}
                                    required
                                />
                            </label>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="modal-cancel"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="modal-save"
                                    disabled={saving}
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