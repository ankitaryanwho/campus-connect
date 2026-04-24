import React, { useState } from "react";

const C = {
  text: "#1C1917",
  textSecondary: "#78716C",
  textTertiary: "#A8A29E",
  background: "#FAF8F4",
  backgroundSecondary: "#F5F3EF",
  surface: "#FFFFFF",
  border: "#E7E5E4",
  primary: "#5B4FE8",
  primaryLight: "#EDE9FE",
  error: "#EF4444",
  errorLight: "#FEE2E2",
  success: "#10B981",
};

const USER = {
  name: "Aryan Sharma",
  email: "aryan.sharma@kiit.ac.in",
  role: "student",
  bio: "BCA student at KIIT. Helping juniors crack DBMS and OS papers. DM for notes & study plans.",
  college: "KIIT University",
  program: "BCA · 2nd Year",
  postsCount: 12,
  followersCount: 486,
  followingCount: 234,
  verified: true,
};

const SERVICES = [
  { label: "Assignments", color: "#5B4FE8" },
  { label: "Coaching", color: "#10B981" },
];

const POSTS = [
  { id: 1, content: "Just dropped my full DBMS Unit 4 notes — normalization, ACID, and 50+ practice questions. Free for all juniors.", likes: 142, comments: 38, date: "12 Apr", thumb: true },
  { id: 2, content: "Anyone up for a 6am library group? Trying to lock in for end-sems. Hall B, second floor.", likes: 28, comments: 14, date: "9 Apr" },
  { id: 3, content: "Selling my old DSA textbook (Cormen) — barely used. ₹450. DM if interested.", likes: 9, comments: 6, date: "5 Apr" },
];

function Icon({ name, size = 16, color = "#1C1917", stroke = 2 }: any) {
  const paths: Record<string, React.ReactNode> = {
    "edit-2": <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    "log-out": <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></>,
    "share-2": <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    "map-pin": <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    "book-open": <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
    "file-text": <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    "user-plus": <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
    "message-circle": <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>,
    "trending-up": <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export function TabbedCards() {
  const [activeTab, setActiveTab] = useState("Posts");

  return (
    <div style={{ background: C.background, fontFamily: "'Inter', sans-serif", maxWidth: 390, margin: "0 auto", minHeight: "100vh", color: C.text, paddingBottom: 40 }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px" }}>
        <button style={{ width: 40, height: 40, borderRadius: 20, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="edit-2" size={18} color={C.text} />
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ width: 40, height: 40, borderRadius: 20, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="bell" size={18} color={C.text} />
          </button>
          <button style={{ width: 40, height: 40, borderRadius: 20, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="log-out" size={18} color={C.error} />
          </button>
        </div>
      </div>

      {/* Identity Card */}
      <div style={{ padding: "0 16px", marginTop: 8 }}>
        <div style={{ background: C.surface, borderRadius: 24, padding: 20, border: `1px solid ${C.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 84, height: 84, borderRadius: 42, background: `linear-gradient(135deg, ${C.primary}, #9F94F8)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28, fontWeight: 700 }}>
                AS
              </div>
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}` }}>
                <Icon name="camera" size={14} color={C.textSecondary} />
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{USER.name}</span>
                {USER.verified && (
                  <div style={{ width: 16, height: 16, borderRadius: 8, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="check" size={10} color="#fff" stroke={3} />
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ padding: "2px 8px", borderRadius: 12, background: C.primaryLight, color: C.primary, fontSize: 11, fontWeight: 600 }}>
                  {USER.role}
                </div>
                <span style={{ fontSize: 13, color: C.textSecondary }}>{USER.email}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 14, lineHeight: "20px", color: C.text }}>
            {USER.bio}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="map-pin" size={14} color={C.textTertiary} />
              <span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>{USER.college}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="book-open" size={14} color={C.textTertiary} />
              <span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>{USER.program}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button style={{ flex: 1, padding: "10px 0", borderRadius: 12, background: C.primary, color: "#fff", fontSize: 14, fontWeight: 600, border: "none" }}>
              Edit Profile
            </button>
            <button style={{ padding: "0 16px", borderRadius: 12, background: C.backgroundSecondary, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="share-2" size={18} color={C.text} />
            </button>
          </div>

          {/* Stats Pill Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 16px", borderRadius: 16, background: C.backgroundSecondary }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{USER.postsCount}</span>
              <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 500 }}>Posts</span>
            </div>
            <div style={{ width: 1, height: 24, background: C.border }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{USER.followersCount}</span>
              <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 500 }}>Followers</span>
            </div>
            <div style={{ width: 1, height: 24, background: C.border }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{USER.followingCount}</span>
              <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 500 }}>Following</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "24px 16px 16px", gap: 24, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: "rgba(250, 248, 244, 0.9)", backdropFilter: "blur(8px)", zIndex: 10 }}>
        {["Posts", "About", "Activity"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "none", border: "none", padding: 0, margin: 0,
              fontSize: 15, fontWeight: activeTab === tab ? 700 : 600,
              color: activeTab === tab ? C.text : C.textTertiary,
              position: "relative", paddingBottom: 8,
            }}
          >
            {tab} {tab === "Posts" && `(${USER.postsCount})`}
            {activeTab === tab && (
              <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: C.primary, borderRadius: "2px 2px 0 0" }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "16px" }}>
        {activeTab === "Posts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {POSTS.map((p) => (
              <div key={p.id} style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: `linear-gradient(135deg, ${C.primary}, #9F94F8)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                    AS
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{USER.name}</span>
                      <span style={{ fontSize: 13, color: C.textSecondary }}>· {p.date}</span>
                    </div>
                  </div>
                </div>

                {p.thumb && (
                  <div style={{ width: "100%", height: 160, background: "linear-gradient(135deg, #EDE9FE, #C7D2FE)", borderRadius: 12, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", color: C.primary, fontWeight: 600, fontSize: 14 }}>
                    DBMS Notes · Unit 4
                  </div>
                )}

                <p style={{ fontSize: 15, lineHeight: "22px", margin: 0, marginBottom: 16, color: C.text }}>
                  {p.content}
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, color: C.textSecondary, fontWeight: 500 }}>
                    <Icon name="heart" size={18} color={C.textSecondary} />
                    <span style={{ fontSize: 13 }}>{p.likes}</span>
                  </button>
                  <button style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, color: C.textSecondary, fontWeight: 500 }}>
                    <Icon name="message-circle" size={18} color={C.textSecondary} />
                    <span style={{ fontSize: 13 }}>{p.comments}</span>
                  </button>
                  <button style={{ marginLeft: "auto", background: "none", border: "none", padding: 0 }}>
                    <Icon name="share-2" size={18} color={C.textTertiary} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "About" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px 0" }}>Services Offered</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {SERVICES.map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 24, background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: s.color }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: s.color }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "Activity" && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.textSecondary }}>
            No recent activity.
          </div>
        )}
      </div>
    </div>
  );
}
