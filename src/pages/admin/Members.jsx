import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Members.css";

function Members() {
    const [activeMembers, setActiveMembers] = useState([]);
    const [pendingMembers, setPendingMembers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [activeTab, setActiveTab] = useState("active");

    const [showAddModal, setShowAddModal] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    useEffect(() => {
        loadMembers();
    }, []);

    async function loadMembers() {
        setLoading(true);
        setError("");

        const { data: activeData, error: activeError } =
            await supabase
                .from("profiles")
                .select("id, full_name, created_at")
                .eq("role", "member")
                .order("full_name");

        if (activeError) {
            console.error(activeError);
            setError("Unable to load active members.");
            setLoading(false);
            return;
        }

        const { data: pendingData, error: pendingError } =
            await supabase
                .from("member_invites")
                .select("id, full_name, email, created_at")
                .eq("approved", false)
                .order("created_at", {
                    ascending: false,
                });

        if (pendingError) {
            console.error(pendingError);
            setError("Unable to load pending members.");
            setLoading(false);
            return;
        }

        setActiveMembers(activeData ?? []);
        setPendingMembers(pendingData ?? []);
        setLoading(false);
    }

    function openAddModal() {
        setFullName("");
        setEmail("");
        setFormError("");
        setShowAddModal(true);
    }

    function closeAddModal() {
        if (saving) return;

        setShowAddModal(false);
        setFormError("");
    }

    async function handleAddMember(e) {
        e.preventDefault();

        setFormError("");
        setSuccess("");

        const trimmedName = fullName.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedName) {
            setFormError("Please enter the member's name.");
            return;
        }

        if (!trimmedEmail) {
            setFormError("Please enter the member's email.");
            return;
        }

        setSaving(true);

        const { error } = await supabase
            .from("member_invites")
            .insert({
                full_name: trimmedName,
                email: trimmedEmail,
            });

        if (error) {
            console.error(error);

            if (error.code === "23505") {
                setFormError(
                    "An invitation for this email already exists."
                );
            } else {
                setFormError(
                    "Unable to create the member invitation."
                );
            }

            setSaving(false);
            return;
        }

        setSaving(false);
        setShowAddModal(false);
        setFullName("");
        setEmail("");

        setSuccess(
            `${trimmedName} has been added to pending members.`
        );

        await loadMembers();
    }

    async function approveMember(invite) {
        setError("");
        setSuccess("");

        const { error } = await supabase
            .from("member_invites")
            .update({ approved: true })
            .eq("id", invite.id);

        if (error) {
            console.error(error);
            setError("Unable to approve member.");
            return;
        }

        setSuccess(`${invite.full_name} has been approved.`);

        await loadMembers();
    }

    async function rejectMember(invite) {
        const confirmed = window.confirm(
            `Reject ${invite.full_name}'s membership request?`
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");

        const { error } = await supabase
            .from("member_invites")
            .delete()
            .eq("id", invite.id);

        if (error) {
            console.error(error);
            setError("Unable to reject member.");
            return;
        }

        setSuccess(`${invite.full_name}'s request was rejected.`);

        await loadMembers();
    }

    if (loading) {
        return (
            <section className="members-page">
                <div className="members-loading">
                    Loading members...
                </div>
            </section>
        );
    }

    return (
        <section className="members-page">
            <div className="members-header">
                <div>
                    <h1>Members</h1>
                    <p>Manage attendance portal members.</p>
                </div>

                <button
                    className="add-member-button"
                    onClick={openAddModal}
                >
                    + Add Member
                </button>
            </div>

            {success && (
                <div className="members-success">
                    {success}
                </div>
            )}

            {error && (
                <div className="members-error">
                    {error}
                </div>
            )}

            <div className="members-tabs">
                <button
                    className={
                        activeTab === "active"
                            ? "member-tab active"
                            : "member-tab"
                    }
                    onClick={() => setActiveTab("active")}
                >
                    Active Members
                    <span>{activeMembers.length}</span>
                </button>

                <button
                    className={
                        activeTab === "pending"
                            ? "member-tab active"
                            : "member-tab"
                    }
                    onClick={() => setActiveTab("pending")}
                >
                    Pending
                    {pendingMembers.length > 0 && (
                        <span className="pending-count">
                            {pendingMembers.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === "active" ? (
                <div className="members-table">
                    <div className="members-table-header">
                        <span>Member</span>
                        <span>Joined</span>
                        <span>Actions</span>
                    </div>

                    {activeMembers.length === 0 ? (
                        <div className="members-empty">
                            No active members found.
                        </div>
                    ) : (
                        activeMembers.map((member) => (
                            <div
                                className="member-row"
                                key={member.id}
                            >
                                <div className="member-info">
                                    <div className="member-avatar">
                                        {member.full_name
                                            ?.charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div>
                                        <strong>
                                            {member.full_name}
                                        </strong>
                                        <small>Active Member</small>
                                    </div>
                                </div>

                                <div className="member-joined">
                                    {new Date(
                                        member.created_at
                                    ).toLocaleDateString(
                                        "en-IN",
                                        {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        }
                                    )}
                                </div>

                                <div>
                                    <button className="view-button">
                                        View
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="members-table">
                    <div className="pending-table-header">
                        <span>Member</span>
                        <span>Email</span>
                        <span>Requested</span>
                        <span>Actions</span>
                    </div>

                    {pendingMembers.length === 0 ? (
                        <div className="members-empty">
                            No pending members.
                        </div>
                    ) : (
                        pendingMembers.map((member) => (
                            <div
                                className="pending-row"
                                key={member.id}
                            >
                                <div className="member-info">
                                    <div className="member-avatar">
                                        {member.full_name
                                            ?.charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div>
                                        <strong>
                                            {member.full_name}
                                        </strong>
                                        <small>
                                            Pending approval
                                        </small>
                                    </div>
                                </div>

                                <div className="pending-email">
                                    {member.email}
                                </div>

                                <div className="member-joined">
                                    {new Date(
                                        member.created_at
                                    ).toLocaleDateString(
                                        "en-IN",
                                        {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        }
                                    )}
                                </div>

                                <div className="pending-actions">
                                    <button
                                        className="approve-button"
                                        onClick={() =>
                                            approveMember(
                                                member
                                            )
                                        }
                                    >
                                        Approve
                                    </button>

                                    <button
                                        className="reject-button"
                                        onClick={() =>
                                            rejectMember(
                                                member
                                            )
                                        }
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {showAddModal && (
                <div
                    className="modal-overlay"
                    onMouseDown={closeAddModal}
                >
                    <div
                        className="member-modal"
                        onMouseDown={(e) =>
                            e.stopPropagation()
                        }
                    >
                        <div className="modal-header">
                            <div>
                                <h2>Add Member</h2>
                                <p>
                                    Add a member for approval.
                                </p>
                            </div>

                            <button
                                className="modal-close"
                                onClick={closeAddModal}
                                disabled={saving}
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
                                    placeholder="Enter full name"
                                    disabled={saving}
                                />
                            </label>

                            <label>
                                Email
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter email address"
                                    disabled={saving}
                                />
                            </label>

                            {formError && (
                                <div className="members-error">
                                    {formError}
                                </div>
                            )}

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="modal-cancel"
                                    onClick={closeAddModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="modal-submit"
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
        </section>
    );
}

export default Members;