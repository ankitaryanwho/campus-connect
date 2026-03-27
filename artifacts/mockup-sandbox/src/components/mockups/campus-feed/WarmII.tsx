export function WarmII() {
  const WARM = {
    bg: "#FAF8F4",
    surface: "#FFFFFF",
    border: "#E7E5E4",
    borderLight: "#F0EDEA",
    text: "#1C1917",
    textSecondary: "#78716C",
    textMuted: "#A8A29E",
    primary: "#5B4FE8",
    primaryLight: "#EDE9FE",
  };

  const CATS = [
    { id: "all",     label: "All",      accent: "#5B4FE8", bg: "#EDE9FE", active: true },
    { id: "study",   label: "📚 Study", accent: "#3B82F6", bg: "#EFF6FF", active: false },
    { id: "events",  label: "🎪 Events",accent: "#8B5CF6", bg: "#F5F3FF", active: false },
    { id: "buysell", label: "🛒 Market",accent: "#F59E0B", bg: "#FFFBEB", active: false },
    { id: "social",  label: "💬 Social",accent: "#10B981", bg: "#ECFDF5", active: false },
  ];

  const miniPosts = [
    { id: 1, author: "Riya S.", time: "12m", content: "DBMS notes for Unit 4 needed — exam in 3 days!", accent: "#3B82F6", bg: "#EFF6FF", emoji: "📚" },
    { id: 2, author: "Karan M.", time: "2h", content: "AI in Business workshop Sunday LT-3 — free entry!", accent: "#8B5CF6", bg: "#F5F3FF", emoji: "🎪" },
    { id: 3, author: "Anon", time: "45m", content: "HP laptop i5 10th gen 8GB — ₹28,000. Barely used.", accent: "#F59E0B", bg: "#FFFBEB", emoji: "🛒" },
  ];

  const feedPosts = [
    {
      id: 10, author: "Priya R.", initials: "PR", program: "BCA · 3rd Year", time: "3h ago",
      content: "Looking for a React Native collaborator for the college fest project. Reach out if interested!",
      likes: 7, comments: 18, liked: false,
      catAccent: "#10B981", catBg: "#ECFDF5", catEmoji: "💬", catLabel: "Social",
      grad: "linear-gradient(135deg, #667eea, #764ba2)", verified: false,
    },
    {
      id: 11, author: "Arnav D.", initials: "AD", program: "BTech · 2nd Year", time: "5h ago",
      content: "Selling my gaming headset — HyperX Cloud II, excellent condition. ₹2,200 only. Hostel pickup.",
      likes: 19, comments: 8, liked: false,
      catAccent: "#F59E0B", catBg: "#FFFBEB", catEmoji: "🛒", catLabel: "Market",
      grad: "linear-gradient(135deg, #4facfe, #00f2fe)", verified: true,
    },
    {
      id: 12, author: "Meera V.", initials: "MV", program: "MBA · 2nd Year", time: "6h ago",
      content: "Study group for finance exam tomorrow 8pm at Library Reading Room. Join if you need help!",
      likes: 12, comments: 5, liked: true,
      catAccent: "#3B82F6", catBg: "#EFF6FF", catEmoji: "📚", catLabel: "Study",
      grad: "linear-gradient(135deg, #43e97b, #38f9d7)", verified: false,
    },
  ];

  return (
    <div style={{ background: WARM.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", maxWidth: 390, margin: "0 auto", position: "relative" }}>
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px 4px", fontSize: 11, fontWeight: 600, color: WARM.text }}>
        <span>9:41</span>
        <span style={{ fontSize: 11, color: WARM.textMuted }}>●●●</span>
      </div>

      {/* ── Header: greeting + college pill ── */}
      <div style={{ padding: "10px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: WARM.textMuted, fontWeight: 500, marginBottom: 2 }}>Good morning ☀️</p>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: WARM.text, letterSpacing: "-0.8px", lineHeight: 1.1 }}>Campus Board</h1>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, paddingTop: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg, #5B4FE8, #7B73F0)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>A</div>
          </div>
        </div>
      </div>

      {/* ── Tab bar (underline style) ── */}
      <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", borderBottom: `1px solid ${WARM.border}`, padding: "0 16px" }}>
        {CATS.map(cat => (
          <button key={cat.id} style={{
            flexShrink: 0,
            padding: "8px 12px",
            fontSize: 12.5,
            fontWeight: cat.active ? 700 : 500,
            color: cat.active ? cat.accent : WARM.textMuted,
            background: "none",
            border: "none",
            borderBottom: cat.active ? `2.5px solid ${cat.accent}` : "2.5px solid transparent",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            marginBottom: -1,
          }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Horizontal mini-cards (mixed categories) ── */}
      <div style={{ marginTop: 16, marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: WARM.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Trending Now</span>
          <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: WARM.primary, padding: 0 }}>See all →</button>
        </div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", padding: "0 16px 4px" }}>
          {miniPosts.map(p => (
            <div key={p.id} style={{ flexShrink: 0, width: 160, background: WARM.surface, borderRadius: 14, padding: "12px 12px 10px", boxShadow: "0 1px 6px rgba(28,25,23,0.05)", borderTop: `3px solid ${p.accent}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 1, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{p.emoji}</span>
                <span style={{ fontSize: 10, color: p.accent, fontWeight: 700, marginLeft: 4 }}>{p.time}</span>
              </div>
              <p style={{ margin: "0 0 6px", fontSize: 11.5, color: WARM.text, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.content}</p>
              <p style={{ margin: 0, fontSize: 10, color: WARM.textMuted, fontWeight: 500 }}>— {p.author}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Compose ── */}
      <div style={{ margin: "16px 16px 6px", background: WARM.surface, borderRadius: 14, border: `0.5px solid ${WARM.border}`, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #5B4FE8, #7B73F0)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>A</div>
        <div style={{ flex: 1, height: 34, background: "#F5F3EF", borderRadius: 10, display: "flex", alignItems: "center", paddingLeft: 12 }}>
          <span style={{ fontSize: 13, color: WARM.textMuted }}>What's on your mind?</span>
        </div>
        <button style={{ width: 34, height: 34, borderRadius: 10, background: WARM.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={WARM.primary} strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>

      {/* ── Feed label ── */}
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 0.5, background: WARM.border }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: WARM.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>All Posts</span>
        <div style={{ flex: 1, height: 0.5, background: WARM.border }} />
      </div>

      {/* ── Feed posts ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px 120px" }}>
        {feedPosts.map(post => (
          <div key={post.id} style={{ background: WARM.surface, borderRadius: 16, borderLeft: `3px solid ${post.catAccent}`, overflow: "hidden", boxShadow: "0 1px 8px rgba(28,25,23,0.05)" }}>
            {/* Top section */}
            <div style={{ padding: "13px 13px 0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: post.grad, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{post.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: WARM.text }}>{post.author}</span>
                    {post.verified && (
                      <span style={{ width: 14, height: 14, borderRadius: "50%", background: "linear-gradient(135deg, #5B4FE8, #7B73F0)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: WARM.textMuted }}>{post.program} · {post.time}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: post.catAccent, background: post.catBg, padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>{post.catEmoji} {post.catLabel}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 13.5, color: WARM.text, lineHeight: 1.55 }}>{post.content}</p>
            </div>
            {/* Action bar — subtly separated */}
            <div style={{ borderTop: `0.5px solid ${WARM.borderLight}`, padding: "9px 13px", display: "flex", alignItems: "center", gap: 16 }}>
              <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill={post.liked ? "#EF4444" : "none"} stroke={post.liked ? "#EF4444" : WARM.textMuted} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span style={{ fontSize: 12, fontWeight: 500, color: post.liked ? "#EF4444" : WARM.textMuted }}>{post.likes}</span>
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={WARM.textMuted} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span style={{ fontSize: 12, fontWeight: 500, color: WARM.textMuted }}>{post.comments}</span>
              </button>
              <div style={{ flex: 1 }} />
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={WARM.textMuted} strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={WARM.textMuted} strokeWidth="2"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom nav ── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: "rgba(250,248,244,0.96)", backdropFilter: "blur(20px)", borderTop: `0.5px solid ${WARM.border}`, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "8px 24px 20px" }}>
        {[
          { label: "Home", d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", active: true },
          { label: "Services", d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", active: false },
          { label: "Chat", d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", active: false },
          { label: "Profile", d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", active: false, profile: true },
        ].map(item => (
          <button key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ width: 40, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: item.active ? WARM.primaryLight : "transparent" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={item.active ? WARM.primary : "none"} stroke={item.active ? WARM.primary : WARM.textMuted} strokeWidth="1.8">
                <path d={item.d} />
                {item.profile && <circle cx="12" cy="7" r="4" />}
              </svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: item.active ? 700 : 500, color: item.active ? WARM.primary : WARM.textMuted }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
