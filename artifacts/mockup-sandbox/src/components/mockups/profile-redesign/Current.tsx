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
  badge: { label: "Top Contributor", icon: "★", color: "#F59E0B" },
};

const SERVICES = [
  { label: "Assignments", icon: "📝", color: "#5B4FE8" },
  { label: "Coaching", icon: "👥", color: "#10B981" },
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

export function Current() {
  return (
    <div style={{ background: C.background, fontFamily: "'Inter', sans-serif", maxWidth: 390, margin: "0 auto", minHeight: "100vh", color: C.text }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 12px" }}>
        <button style={{ width: 38, height: 38, borderRadius: 19, background: C.backgroundSecondary, border: `0.5px solid ${C.border}`, display: "grid", placeItems: "center" }}>
          <Icon name="edit-2" size={16} color={C.text} />
        </button>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Profile</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ width: 38, height: 38, borderRadius: 19, background: C.backgroundSecondary, border: `0.5px solid ${C.border}`, display: "grid", placeItems: "center" }}>
            <Icon name="bell" size={16} color={C.text} />
          </button>
          <button style={{ width: 38, height: 38, borderRadius: 19, background: C.errorLight, border: `0.5px solid ${C.error}33`, display: "grid", placeItems: "center" }}>
            <Icon name="log-out" size={16} color={C.error} />
          </button>
        </div>
      </div>

      {/* Banner */}
      <div style={{ height: 130, position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #292524 0%, #57534E 50%, #A8A29E 100%)" }}>
        <div style={{ position: "absolute", top: -40, right: -20, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
        <div style={{ position: "absolute", top: 16, right: 16, display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, background: "rgba(255,255,255,0.2)" }}>
          <span style={{ color: "#fff", fontSize: 12 }}>★</span>
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>{USER.badge.label}</span>
        </div>
      </div>

      {/* Avatar + Quick actions */}
      <div style={{ padding: "0 16px 8px", marginTop: -36 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 90, height: 90, borderRadius: 45, background: "linear-gradient(135deg, #5B4FE8, #7B73F0)", display: "grid", placeItems: "center" }}>
              <div style={{ width: 82, height: 82, borderRadius: 41, background: C.background, display: "grid", placeItems: "center" }}>
                <div style={{ width: 78, height: 78, borderRadius: 39, background: "linear-gradient(135deg, #5B4FE8, #9F94F8)", display: "grid", placeItems: "center", color: "#fff", fontSize: 28, fontWeight: 700 }}>AS</div>
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 2, right: 0, width: 26, height: 26, borderRadius: 13, background: C.primary, display: "grid", placeItems: "center", border: "2px solid #fff" }}>
              <Icon name="camera" size={12} color="#fff" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 4 }}>
            <button style={{ padding: "8px 16px", borderRadius: 20, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontWeight: 600, color: C.text }}>
              Edit Profile
            </button>
            <button style={{ width: 36, height: 36, borderRadius: 18, background: C.backgroundSecondary, display: "grid", placeItems: "center", border: "none" }}>
              <Icon name="share-2" size={16} color={C.text} />
            </button>
          </div>
        </div>

        {/* Name block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{USER.name}</span>
            {USER.verified && (
              <div style={{ width: 18, height: 18, borderRadius: 9, background: "linear-gradient(135deg, #5B4FE8, #7B73F0)", display: "grid", placeItems: "center" }}>
                <Icon name="check" size={11} color="#fff" stroke={3} />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: `${C.primary}18` }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: C.primary }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>{USER.role}</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary }}>{USER.email}</div>
          <div style={{ fontSize: 14, lineHeight: "20px", color: C.text }}>{USER.bio}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="map-pin" size={12} color={C.textTertiary} />
              <span style={{ fontSize: 12, color: C.textSecondary }}>{USER.college}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="book-open" size={12} color={C.textTertiary} />
              <span style={{ fontSize: 12, color: C.textSecondary }}>{USER.program}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", padding: "0 16px", gap: 10, marginTop: 16, marginBottom: 8 }}>
        {[
          { value: USER.postsCount, label: "Posts", icon: "file-text", color: "#5B4FE8" },
          { value: USER.followersCount, label: "Followers", icon: "users", color: "#10B981" },
          { value: USER.followingCount, label: "Following", icon: "user-plus", color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, borderRadius: 16, border: `0.5px solid ${C.border}`, background: C.surface, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: `${s.color}18`, display: "grid", placeItems: "center" }}>
              <Icon name={s.icon} size={16} color={s.color} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.textSecondary }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Services */}
      <div style={{ padding: "0 16px", marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: C.textTertiary, marginBottom: 10 }}>SERVICES OFFERED</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SERVICES.map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 20, background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
              <span style={{ fontSize: 13 }}>{s.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div style={{ padding: "0 16px", marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: C.textTertiary }}>MY POSTS</div>
          <div style={{ padding: "3px 10px", borderRadius: 20, background: C.primaryLight }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.primary }}>{POSTS.length}</span>
          </div>
        </div>

        {POSTS.map((p) => (
          <div key={p.id} style={{ borderRadius: 16, border: `0.5px solid ${C.border}`, background: C.surface, marginBottom: 10, overflow: "hidden" }}>
            {p.thumb && (
              <div style={{ width: "100%", height: 120, background: "linear-gradient(135deg, #EDE9FE, #C7D2FE)", display: "grid", placeItems: "center", color: "#5B4FE8", fontSize: 11, fontWeight: 600 }}>DBMS Notes · Unit 4</div>
            )}
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 14, lineHeight: "20px", color: C.text, marginBottom: 10 }}>{p.content}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="heart" size={12} color="#EF4444" />
                  <span style={{ fontSize: 12, color: C.textTertiary }}>{p.likes}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="message-circle" size={12} color={C.primary} />
                  <span style={{ fontSize: 12, color: C.textTertiary }}>{p.comments}</span>
                </div>
                <span style={{ marginLeft: "auto", fontSize: 12, color: C.textTertiary }}>{p.date}</span>
              </div>
            </div>
          </div>
        ))}

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
