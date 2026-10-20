
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Users, BriefcaseBusiness, UserRoundCheck,
  Plus, Search, Bell, Pencil, Trash2, RefreshCw, X,
  UserPlus, CalendarDays, TrendingUp, ChevronDown
} from "lucide-react";
import { supabase } from "./supabase";


const STATUSES = [
  "Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"
];

const COLORS = {
  Applied: "#6484f7",
  Screening: "#29a5c5",
  Interview: "#e9a23b",
  Offer: "#9b70e5",
  Hired: "#26a269",
  Rejected: "#e35c6b",
};

const EMPTY_FORM = {
  full_name: "",
  email: "",
  phone: "",
  job_position: "",
  experience: "0",
  status: "Applied",
  notes: "",
};

function Metric({ label, value, hint, icon: Icon, color }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="metric-icon" style={{ background: color + "18", color }}>
          <Icon size={18} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">{hint}</div>
    </div>
  );
}

function App() {
  const [candidates, setCandidates] = useState([]);
  const [activePage, setActivePage] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All stages");
  const [positionFilter, setPositionFilter] = useState("All positions");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);



const [profile, setProfile] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("hiretrack-profile")) || {
      name: "Recruiter",
      email: "",
      role: "Administrator",
    };
  } catch {
    return {
      name: "Recruiter",
      email: "",
      role: "Administrator",
    };
  }
});

const [settings, setSettings] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("hiretrack-settings")) || {
      darkMode: false,
      notifications: true,
    };
  } catch {
    return { darkMode: false, notifications: true };
  }
});

const saveProfile = (updatedProfile) => {
  setProfile(updatedProfile);
  localStorage.setItem("hiretrack-profile", JSON.stringify(updatedProfile));
};

const saveSettings = (updatedSettings) => {
  setSettings(updatedSettings);
  localStorage.setItem("hiretrack-settings", JSON.stringify(updatedSettings));
};




  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setCandidates([]);
    } else {
      setCandidates(data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const positions = useMemo(
    () => [...new Set(candidates.map(c => c.job_position).filter(Boolean))].sort(),
    [candidates]
  );

  const filteredCandidates = useMemo(() => {
    const term = search.trim().toLowerCase();

    return candidates.filter(candidate => {
      const matchesSearch = [
        candidate.full_name,
        candidate.email,
        candidate.job_position,
        candidate.phone,
      ].some(value => (value || "").toLowerCase().includes(term));

      const matchesStatus =
        statusFilter === "All stages" || candidate.status === statusFilter;

      const matchesPosition =
        positionFilter === "All positions" ||
        candidate.job_position === positionFilter;

      return matchesSearch && matchesStatus && matchesPosition;
    });
  }, [candidates, search, statusFilter, positionFilter]);

  const countStatus = status =>
    candidates.filter(c => c.status === status).length;

  function openAddModal() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
    setError("");
    setNotice("");
  }

  function openEditModal(candidate) {
    setEditingId(candidate.id);
    setForm({
      ...EMPTY_FORM,
      ...candidate,
      experience: String(candidate.experience ?? 0),
      phone: candidate.phone || "",
      notes: candidate.notes || "",
    });
    setModalOpen(true);
    setError("");
    setNotice("");
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  }

  async function saveCandidate(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      job_position: form.job_position.trim(),
      experience: Number(form.experience || 0),
      status: form.status,
      notes: form.notes.trim() || null,
    };

    const result = editingId
      ? await supabase.from("candidates").update(payload).eq("id", editingId)
      : await supabase.from("candidates").insert(payload);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setModalOpen(false);
    setNotice(editingId ? "Candidate updated successfully." : "Candidate added successfully.");
    setSaving(false);
    await loadCandidates();
  }

  async function deleteCandidate(candidate) {
    const confirmed = window.confirm(
      `Delete ${candidate.full_name}? This action cannot be undone.`
    );
    if (!confirmed) return;

    setError("");
    setNotice("");

    const { error: deleteError } = await supabase
      .from("candidates")
      .delete()
      .eq("id", candidate.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setNotice("Candidate deleted successfully.");
    await loadCandidates();
  }

  async function changeStatus(candidate, status) {
    setError("");
    setNotice("");

    const { error: updateError } = await supabase
      .from("candidates")
      .update({ status })
      .eq("id", candidate.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNotice(`${candidate.full_name}'s stage updated to ${status}.`);
    await loadCandidates();
  }

  const dateLabel = value => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric"
        });
  };

  return (
    <div className={`app ${settings.darkMode ? "dark-mode" : ""}`}>
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon"><BriefcaseBusiness size={21} /></div>
            <div>
              <h2>HireTrack</h2>
              <small>Talent workspace</small>
            </div>
          </div>

          <div className="nav-label">WORKSPACE</div>
          
<button
  className={`nav-item ${activePage === "Dashboard" ? "active" : ""}`}
  onClick={() => setActivePage("Dashboard")}
>
  <LayoutDashboard size={17} /> Dashboard
</button>

<button
  className={`nav-item ${activePage === "Candidates" ? "active" : ""}`}
  onClick={() => {
  setActivePage("Candidates");
  setStatusFilter("All stages");
  setPositionFilter("All positions");
}}
>
  <Users size={17} /> Candidates
</button>

<button
  className={`nav-item ${activePage === "Hiring pipeline" ? "active" : ""}`}
  onClick={() => {
  setActivePage("Hiring pipeline");
  setStatusFilter("All stages");
}}
>
  <BriefcaseBusiness size={17} /> Hiring pipeline
</button>

<button
  className={`nav-item ${activePage === "Interviews" ? "active" : ""}`}
  onClick={() => {
    setActivePage("Interviews");
    setStatusFilter("Interview");
  }}
>
  <CalendarDays size={17} /> Interviews
</button>


          <div className="sidebar-note">
            <strong>Recruitment overview</strong>
            Manage your candidate pipeline, follow hiring progress, and keep all applicant details organized.
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="breadcrumb">Workspace&nbsp; / &nbsp;<strong>Dashboard</strong></div>
            <div className="profile">
              
{/* Notification button */}
<button
  type="button"
  className="icon-button"
  onClick={() => {
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false);
  }}
  aria-label="Notifications"
>
  <Bell size={18} />
</button>

{showNotifications && (
  <div className="navbar-dropdown">
    <strong>Notifications</strong>
    <p>No new notifications.</p>
  </div>
)}

{/* Profile dropdown button */}
<button
  type="button"
  className="profile-button"
  onClick={() => {
    setShowProfileMenu(!showProfileMenu);
    setShowNotifications(false);
  }}
  aria-expanded={showProfileMenu}
>
  <span className="avatar">{(profile.name || "HT").trim().slice(0, 2).toUpperCase()}</span>
  <span>
    <div><strong>{profile.name || "Recruiter"}</strong><div style={{ color: "#929bad", marginTop: 3 }}>{profile.role}</div></div>
  </span>
  <ChevronDown size={16} />
</button>

{showProfileMenu && (
  <div className="navbar-dropdown profile-dropdown">
    <button type="button" onClick={() => {
      setActivePage("My Profile");
      setShowProfileMenu(false);
    }}>My Profile</button>
    <button type="button" onClick={() => {
      setActivePage("Settings");
      setShowProfileMenu(false);
    }}>Settings</button>
  </div>
)}
            </div>
          </header>

          <section className="content">
            <div className="page-heading">
              <div>
               
<h1>
  {activePage === "Dashboard" && "Recruitment Dashboard"}
  {activePage === "Candidates" && "Candidate Management"}
  {activePage === "Hiring pipeline" && "Hiring Pipeline"}
  {activePage === "Interviews" && "Interview Candidates"}
  {activePage === "My Profile" && "My Profile"}
  {activePage === "Settings" && "Settings"}
</h1>

<p>
  {activePage === "Dashboard" && "Track applicants, monitor hiring stages, and find the right talent."}
  {activePage === "Candidates" && "Search, review, add, edit, and manage applicants."}
  {activePage === "Hiring pipeline" && "Monitor candidate distribution across all six hiring stages."}
  {activePage === "Interviews" && "Review candidates currently in the interview stage."}
  {activePage === "My Profile" && "Manage your recruiter account information."}
  {activePage === "Settings" && "Customize your HireTrack experience."}
</p>

              </div>
              {!["My Profile", "Settings"].includes(activePage) && (
                <button className="btn btn-primary" onClick={openAddModal}>
                  <Plus size={16} /> Add candidate
                </button>
              )}
            </div>

            {error && (
              <div className="alert alert-error">
                <strong>Something went wrong:</strong> {error}
                <div style={{ marginTop: 8 }}>
                  Check your Supabase URL, publishable key, table, and database permissions.
                </div>
              </div>
            )}
            {notice && <div className="alert alert-success">{notice}</div>}

            {activePage === "Dashboard" && (
            <div className="metrics">
              <Metric label="Total candidates" value={candidates.length}
                hint="All applicants in your database" icon={Users} color="#635bff" />
              <Metric label="In interview" value={countStatus("Interview")}
                hint="Candidates at interview stage" icon={CalendarDays} color="#e9a23b" />
              <Metric label="Offers made" value={countStatus("Offer")}
                hint="Candidates with an offer" icon={TrendingUp} color="#9b70e5" />
              <Metric label="Successfully hired" value={countStatus("Hired")}
                hint="Candidates marked as hired" icon={UserRoundCheck} color="#26a269" />
            </div>
            )}
            
            {(activePage === "Dashboard" ||
             activePage === "Hiring pipeline") && (
            <section className="pipeline-card">
              <div className="section-heading">
                <div>
                  <h3>Hiring pipeline</h3>
                  <p>Candidate distribution across recruitment stages</p>
                </div>
                <button className="btn btn-secondary" onClick={loadCandidates} disabled={loading}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              <div className="pipeline">
                {STATUSES.map(status => {
                  const count = countStatus(status);
                  const percent = candidates.length ? count / candidates.length * 100 : 0;

                  return (
                    <div className="stage" key={status}>
                      <div className="stage-name">
                        <span className="stage-dot" style={{ background: COLORS[status] }} />
                        {status}
                      </div>
                      <div className="stage-count">{count}</div>
                      <div className="stage-bar">
                        <span style={{ width: `${percent}%`, background: COLORS[status] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            )}

            
{activePage === "Hiring pipeline" && (
  <section className="pipeline-card">
    <div className="section-heading">
      <div>
        <h3>Candidate stage board</h3>
        <p>Review applicants and update their hiring stages.</p>
      </div>
    </div>

    <div className="candidate-board">
      {STATUSES.map(status => {
        const stageCandidates = candidates.filter(
          candidate => candidate.status === status
        );

        return (
          <div className="board-column" key={status}>
            <div className="board-column-heading">
              <span
                className="stage-dot"
                style={{ background: COLORS[status] }}
              />
              <strong>{status}</strong>
              <span className="board-count">
                {stageCandidates.length}
              </span>
            </div>

            {stageCandidates.length === 0 ? (
              <div className="board-empty">No candidates</div>
            ) : (
              stageCandidates.map(candidate => (
                <div className="board-candidate" key={candidate.id}>
                  <strong>{candidate.full_name}</strong>
                  <p>{candidate.job_position}</p>
                  <small>{candidate.email}</small>

                  <select
                    className="control board-select"
                    value={candidate.status}
                    aria-label={`Change stage for ${candidate.full_name}`}
                    onChange={event =>
                      changeStatus(candidate, event.target.value)
                    }
                  >
                    {STATUSES.map(stage => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  </section>
)}

           {["Dashboard", "Candidates", "Interviews"].includes(activePage) && (
            <section className="table-card">
              <div className="section-heading">
                <div>
                  <h3>All candidates</h3>
                  <p>Manage candidate profiles and recruitment progress</p>
                </div>
                <button className="btn btn-secondary" onClick={openAddModal}>
                  <UserPlus size={15} /> New applicant
                </button>
              </div>

              <div className="toolbar">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    className="control"
                    placeholder="Search name, email, position..."
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                  />
                </div>

                <select className="control" value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value)}
                  aria-label="Filter by hiring stage">
                  <option>All stages</option>
                  {STATUSES.map(status => <option key={status}>{status}</option>)}
                </select>

                <select className="control" value={positionFilter}
                  onChange={event => setPositionFilter(event.target.value)}
                  aria-label="Filter by job position">
                  <option>All positions</option>
                  {positions.map(position => <option key={position}>{position}</option>)}
                </select>
              </div>

              {loading ? (
                <div className="loading">Loading candidates...</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Position</th>
                        <th>Experience</th>
                        <th>Applied on</th>
                        <th>Stage</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map(candidate => (
                        <tr key={candidate.id}>
                          <td>
                            <div className="candidate-cell">
                              <div className="candidate-avatar">
                                {(candidate.full_name || "?").trim().charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="candidate-name">{candidate.full_name}</div>
                                <div className="candidate-email">{candidate.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>{candidate.job_position}</td>
                          <td>{candidate.experience ?? 0} years</td>
                          <td>{dateLabel(candidate.created_at)}</td>
                          <td>
                            <select
                              className={`badge-status status-${candidate.status}`}
                              value={candidate.status}
                              onChange={event => changeStatus(candidate, event.target.value)}
                              aria-label={`Change stage for ${candidate.full_name}`}
                              style={{ border: 0, cursor: "pointer" }}
                            >
                              {STATUSES.map(status => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <div className="actions">
                              <button className="icon-btn" title="Edit candidate"
                                onClick={() => openEditModal(candidate)}>
                                <Pencil size={14} />
                              </button>
                              <button className="icon-btn" title="Delete candidate"
                                onClick={() => deleteCandidate(candidate)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredCandidates.length === 0 && (
                    <div className="empty-state">
                      {candidates.length === 0
                        ? "No candidates yet. Select “Add candidate” to create your first record."
                        : "No candidates match your search or filters."}
                    </div>
                  )}

                  <div className="table-footer">
                    <span>Showing {filteredCandidates.length} of {candidates.length} candidates</span>
                    <span>HireTrack ATS</span>
                  </div>
                </div>
              )}
            </section>
            )}

            {activePage === "My Profile" && (
              <section className="table-card profile-settings-page" style={{ padding: 28, maxWidth: 760 }}>
                <h2>My Profile</h2>
                <p>Manage your recruiter account information.</p>
                <form onSubmit={(event) => {
                  event.preventDefault();
                  saveProfile(profile);
                  setNotice("Profile saved successfully.");
                }} style={{ display: "grid", gap: 12, marginTop: 24 }}>
                  <label htmlFor="profile-name">Full name</label>
                  <input id="profile-name" className="control" value={profile.name}
                    onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
                  <label htmlFor="profile-email">Email address</label>
                  <input id="profile-email" className="control" type="email" value={profile.email}
                    onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
                  <label htmlFor="profile-role">Role</label>
                  <input id="profile-role" className="control" value={profile.role} readOnly />
                  <div><button className="btn btn-primary" type="submit">Save profile</button></div>
                </form>
              </section>
            )}

            {activePage === "Settings" && (
              <section className="table-card profile-settings-page" style={{ padding: 28, maxWidth: 760 }}>
                <h2>Settings</h2>
                <p>Customize your HireTrack experience.</p>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "20px 0", borderBottom: "1px solid #e7eaf1" }}>
                  <span><strong>Dark mode</strong><small style={{ display: "block", marginTop: 5, color: "#7d879b" }}>Use a darker dashboard appearance.</small></span>
                  <input type="checkbox" checked={settings.darkMode} onChange={(event) => {
                    const updated = { ...settings, darkMode: event.target.checked };
                    saveSettings(updated);
                    document.querySelector(".app")?.classList.toggle("dark-mode", updated.darkMode);
                  }} />
                </label>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "20px 0", borderBottom: "1px solid #e7eaf1" }}>
                  <span><strong>Notifications</strong><small style={{ display: "block", marginTop: 5, color: "#7d879b" }}>Enable dashboard notification preferences.</small></span>
                  <input type="checkbox" checked={settings.notifications} onChange={(event) => saveSettings({ ...settings, notifications: event.target.checked })} />
                </label>
              </section>
            )}

            <div className="footer-note">
              HireTrack · Mini Applicant Tracking System · Recruitment workspace
            </div>
          </section>
        </main>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) setModalOpen(false);
        }}>
          <section className="modal" role="dialog" aria-modal="true"
            aria-labelledby="candidate-modal-title">
            <div className="modal-header">
              <div>
                <h2 id="candidate-modal-title">
                  {editingId ? "Edit candidate" : "Add new candidate"}
                </h2>
                <p>Enter the applicant's information below.</p>
              </div>
              <button className="close-btn" onClick={() => setModalOpen(false)}
                disabled={saving} aria-label="Close dialog"><X size={21} /></button>
            </div>

            <form onSubmit={saveCandidate}>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="full_name">Full name *</label>
                  <input className="control" id="full_name" name="full_name"
                    value={form.full_name} onChange={updateField}
                    placeholder="e.g. Alex Johnson" required maxLength={120} />
                </div>

                <div className="field">
                  <label htmlFor="email">Email address *</label>
                  <input className="control" id="email" name="email" type="email"
                    value={form.email} onChange={updateField}
                    placeholder="alex@example.com" required maxLength={254} />
                </div>

                <div className="field">
                  <label htmlFor="phone">Phone number</label>
                  <input className="control" id="phone" name="phone" type="tel"
                    value={form.phone} onChange={updateField}
                    placeholder="Phone number" maxLength={30} />
                </div>

                <div className="field">
                  <label htmlFor="job_position">Job position *</label>
                  <input className="control" id="job_position" name="job_position"
                    value={form.job_position} onChange={updateField}
                    placeholder="e.g. Frontend Developer" required maxLength={120} />
                </div>

                <div className="field">
                  <label htmlFor="experience">Experience (years)</label>
                  <input className="control" id="experience" name="experience"
                    type="number" min="0" max="60" step="0.5"
                    value={form.experience} onChange={updateField} />
                </div>

                <div className="field">
                  <label htmlFor="status">Hiring stage</label>
                  <select className="control" id="status" name="status"
                    value={form.status} onChange={updateField}>
                    {STATUSES.map(status => <option key={status}>{status}</option>)}
                  </select>
                </div>

                <div className="field full">
                  <label htmlFor="notes">Notes</label>
                  <textarea className="control" id="notes" name="notes"
                    value={form.notes} onChange={updateField}
                    placeholder="Interview feedback or other notes..." maxLength={3000} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add candidate"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
