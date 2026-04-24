import React from 'react';

const USER = { name: "Aryan Sharma", email: "aryan.sharma@kiit.ac.in", role: "student",
  bio: "BCA student at KIIT. Helping juniors crack DBMS and OS papers. DM for notes & study plans.",
  college: "KIIT University", program: "BCA · 2nd Year",
  postsCount: 12, followersCount: 486, followingCount: 234, verified: true };
const SERVICES = [ { label: "Assignments", color: "#5B4FE8" }, { label: "Coaching", color: "#10B981" } ];
const POSTS = [
  { id: 1, content: "Just dropped my full DBMS Unit 4 notes — normalization, ACID, and 50+ practice questions. Free for all juniors.", likes: 142, comments: 38, date: "12 Apr", thumb: true },
  { id: 2, content: "Anyone up for a 6am library group? Trying to lock in for end-sems. Hall B, second floor.", likes: 28, comments: 14, date: "9 Apr" },
  { id: 3, content: "Selling my old DSA textbook (Cormen) — barely used. ₹450. DM if interested.", likes: 9, comments: 6, date: "5 Apr" },
];

function Icon({ name, size = 16, color = "currentColor", stroke = 2 }: any) {
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
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export function GlassStats() {
  const glassStyle = {
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.04)"
  };

  return (
    <div style={{ 
      fontFamily: "'Inter', sans-serif", 
      maxWidth: 390, 
      margin: "0 auto", 
      minHeight: "100vh", 
      background: "#FAF8F4",
      position: "relative",
      color: "#1C1917"
    }}>
      {/* Background Gradient Bleed */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, height: 400,
        background: "linear-gradient(160deg, rgba(91, 79, 232, 0.15) 0%, rgba(123, 115, 240, 0.05) 50%, rgba(250, 248, 244, 0) 100%)",
        zIndex: 0
      }} />

      <div style={{ position: "relative", zIndex: 1, paddingBottom: 40 }}>
        {/* Top Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <button style={{ 
            width: 40, height: 40, borderRadius: 20, 
            ...glassStyle,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", border: "none"
          }}>
            <Icon name="edit-2" size={18} color="#1C1917" />
          </button>
          
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ 
              width: 40, height: 40, borderRadius: 20, 
              ...glassStyle,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: "none"
            }}>
              <Icon name="bell" size={18} color="#1C1917" />
            </button>
            <button style={{ 
              width: 40, height: 40, borderRadius: 20, 
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer"
            }}>
              <Icon name="log-out" size={18} color="#EF4444" />
            </button>
          </div>
        </div>

        {/* Identity Card */}
        <div style={{ padding: "0 20px", marginTop: 8 }}>
          <div style={{ 
            ...glassStyle,
            borderRadius: 24,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center"
          }}>
            {/* Avatar */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <div style={{
                width: 96, height: 96, borderRadius: 48,
                background: "linear-gradient(135deg, #5B4FE8, #7B73F0)",
                padding: 3
              }}>
                <div style={{
                  width: "100%", height: "100%", borderRadius: "50%",
                  background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, fontWeight: 700, color: "#5B4FE8"
                }}>
                  {USER.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
              <button style={{
                position: "absolute", bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: 14,
                background: "#5B4FE8", border: "2px solid #fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer"
              }}>
                <Icon name="camera" size={14} color="#fff" />
              </button>
            </div>

            {/* Name & Role */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{USER.name}</h1>
              {USER.verified && (
                <div style={{ width: 20, height: 20, borderRadius: 10, background: "#5B4FE8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" size={12} color="#fff" stroke={3} />
                </div>
              )}
            </div>
            <p style={{ fontSize: 14, color: "#78716C", margin: "0 0 12px 0" }}>{USER.email}</p>

            <div style={{ 
              background: "rgba(91, 79, 232, 0.1)", color: "#5B4FE8",
              padding: "4px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16
            }}>
              {USER.role}
            </div>

            <p style={{ fontSize: 15, lineHeight: "1.5", color: "#1C1917", margin: "0 0 20px 0" }}>
              {USER.bio}
            </p>

            <div style={{ display: "flex", gap: 16, color: "#78716C", fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="map-pin" size={14} /> {USER.college}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="book-open" size={14} /> {USER.program}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 24 }}>
              <button style={{
                flex: 1, padding: "12px 0", borderRadius: 16,
                background: "linear-gradient(135deg, #5B4FE8, #7B73F0)", color: "#fff",
                border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer"
              }}>
                Edit Profile
              </button>
              <button style={{
                width: 44, height: 44, borderRadius: 16,
                background: "rgba(255, 255, 255, 0.8)", border: "1px solid #E7E5E4",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer"
              }}>
                <Icon name="share-2" size={18} color="#1C1917" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: "0 20px", marginTop: 16, display: "flex", gap: 12 }}>
          {[
            { label: "Posts", value: USER.postsCount, icon: "file-text" },
            { label: "Followers", value: USER.followersCount, icon: "users" },
            { label: "Following", value: USER.followingCount, icon: "user-plus" }
          ].map((stat, i) => (
            <div key={i} style={{ 
              flex: 1, ...glassStyle, borderRadius: 20, padding: "16px 12px",
              display: "flex", flexDirection: "column", alignItems: "center"
            }}>
              <div style={{ 
                width: 32, height: 32, borderRadius: 10, background: "rgba(91, 79, 232, 0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8
              }}>
                <Icon name={stat.icon} size={16} color="#5B4FE8" />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: "#78716C", fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Services */}
        <div style={{ padding: "0 20px", marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#78716C", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Services Offered
          </h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {SERVICES.map((s, i) => (
              <div key={i} style={{
                background: "#fff", border: `1px solid ${s.color}33`,
                padding: "8px 16px", borderRadius: 20,
                display: "flex", alignItems: "center", gap: 8
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: s.color }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1C1917" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div style={{ padding: "0 20px", marginTop: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#78716C", margin: "0 0 16px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Recent Posts
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {POSTS.map(post => (
              <div key={post.id} style={{
                background: "#fff", borderRadius: 20, padding: 16,
                border: "1px solid #E7E5E4",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
              }}>
                {post.thumb && (
                  <div style={{
                    width: "100%", height: 140, borderRadius: 12, marginBottom: 16,
                    background: "linear-gradient(135deg, #EDE9FE, #C7D2FE)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#5B4FE8", fontWeight: 600, fontSize: 14
                  }}>
                    DBMS Notes · Unit 4
                  </div>
                )}
                <p style={{ fontSize: 15, lineHeight: "1.5", color: "#1C1917", margin: "0 0 16px 0" }}>
                  {post.content}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid #F5F3EF", paddingTop: 16 }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#78716C", cursor: "pointer", padding: 0 }}>
                    <Icon name="heart" size={16} /> <span style={{ fontSize: 13, fontWeight: 500 }}>{post.likes}</span>
                  </button>
                  <button style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#78716C", cursor: "pointer", padding: 0 }}>
                    <Icon name="message-circle" size={16} /> <span style={{ fontSize: 13, fontWeight: 500 }}>{post.comments}</span>
                  </button>
                  <span style={{ fontSize: 12, color: "#A8A29E", marginLeft: "auto" }}>{post.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
