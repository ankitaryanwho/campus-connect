export function WarmI() {
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
    { id: "all",     label: "All",      emoji: "✦",  accent: "#5B4FE8", bg: "#EDE9FE", active: true },
    { id: "study",   label: "Study",    emoji: "📚", accent: "#3B82F6", bg: "#EFF6FF", active: false },
    { id: "events",  label: "Events",   emoji: "🎪", accent: "#8B5CF6", bg: "#F5F3FF", active: false },
    { id: "buysell", label: "Market",   emoji: "🛒", accent: "#F59E0B", bg: "#FFFBEB", active: false },
    { id: "social",  label: "Social",   emoji: "💬", accent: "#10B981", bg: "#ECFDF5", active: false },
  ];

  const strips = [
    {
      id: "study", label: "Study Help", emoji: "📚", accent: "#3B82F6", bg: "#EFF6FF",
      posts: [
        { id: 1, author: "Riya S.", time: "12m", content: "Need DBMS notes for Unit 4 — exam in 3 days!", likes: 14 },
        { id: 2, author: "Dev M.", time: "1h", content: "Anyone solved the DS assignment Q6? It's tricky.", likes: 7 },
        { id: 3, author: "Anon", time: "2h", content: "BCA 2nd year algorithm notes — anyone?", likes: 5 },
      ],
    },
    {
      id: "events", label: "Events", emoji: "🎪", accent: "#8B5CF6", bg: "#F5F3FF",
      posts: [
        { id: 4, author: "Karan M.", time: "2h", content: "AI in Business workshop — Sunday LT-3, free entry!", likes: 31 },
        { id: 5, author: "Ananya", time: "4h", content: "Hackathon registrations close tonight — hurry!", likes: 22 },
      ],
    },
  ];

  const feedPosts = [
    { id: 10, author: "Priya R.", initials: "PR", grad: ["#667eea","#764ba2"], program: "BCA · 3rd Year", time: "3h ago", content: "Looking for a React Native collaborator for the college fest project. Reach out if interested!", likes: 7, comments: 18, cat: { accent: "#10B981", bg: "#ECFDF5", emoji: "💬" }, verified: false },
    { id: 11, author: "Arnav D.", initials: "AD", grad: ["#4facfe","#00f2fe"], program: "BTech · 2nd Year", time: "5h ago", content: "Selling my gaming headset — HyperX Cloud II, excellent condition. ₹2,200. Pickup from hostel.", likes: 19, comments: 8, cat: { accent: "#F59E0B", bg: "#FFFBEB", emoji: "🛒" }, verified: true },
  ];

  const gradStr = (g: string[]) => `linear-gradient(135deg, ${g[0]}, ${g[1]})`;

  return (
    <div style={{ background: WARM.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", maxWidth: 390, margin: "0 auto", position: "relative" }}>
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 4px", fontSize: 11, fontWeight: 600, color: WARM.text }}>
        <span>9:41</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ width: 14, height: 7, border: `1.5px solid ${WARM.text}`, borderRadius: 3, padding: "1px 2px" }}>
            <div style={{ width: "80%", height: "100%", background: WARM.text, borderRadius: 1.5 }} />
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <div style={{ padding: "12px 20px 14px", borderBottom: `0.5px solid ${WARM.border}`, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: WARM.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Campus Board</span>
            <span style={{ background: WARM.primaryLight, color: WARM.primary, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, letterSpacing: "0.03em" }}>SAITM</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: WARM.text, margin: 0, letterSpacing: "-0.6px", lineHeight: 1.1 }}>Today's Board</h1>
        </div>
        <div style={{ display: "flex", gap: 8, paddingBottom: 2 }}>
          <button style={{ width: 36, height: 36, borderRadius: 12, border: `0.5px solid ${WARM.border}`, background: WARM.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={WARM.textSecondary} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
          <button style={{ width: 36, height: 36, borderRadius: 12, background: WARM.primary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 4px 12px ${WARM.primary}44` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>

      {/* ── Category chips ── */}
      <div style={{ borderBottom: `0.5px solid ${WARM.border}`, overflowX: "auto", scrollbarWidth: "none" }}>
        <div style={{ display: "flex", gap: 6, padding: "10px 16px" }}>
          {CATS.map(cat => (
            <button key={cat.id} style={{
              flexShrink: 0,
              padding: "5px 13px", borderRadius: 20, border: "none", cursor: "pointer",
              background: cat.active ? cat.accent : WARM.surface,
              color: cat.active ? "#fff" : WARM.textSecondary,
              fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif",
              boxShadow: cat.active ? `0 3px 10px ${cat.accent}44` : `0 0 0 1px ${WARM.border}`,
              transition: "all 0.15s",
            }}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Create box ── */}
      <div style={{ margin: "14px 16px 6px", background: WARM.surface, borderRadius: 16, border: `0.5px solid ${WARM.border}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg, #5B4FE8, #7B73F0)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>A</div>
        <div style={{ flex: 1, background: "#F5F3EF", borderRadius: 10, padding: "9px 14px" }}>
          <span style={{ fontSize: 13, color: WARM.textMuted }}>What's on your mind?</span>
        </div>
        <button style={{ width: 36, height: 36, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        </button>
      </div>

      {/* ── Swim-lane strips ── */}
      {strips.map(strip => (
        <div key={strip.id} style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: strip.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{strip.emoji}</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: WARM.text, letterSpacing: "-0.2px" }}>{strip.label}</span>
            </div>
            <button style={{ display: "flex", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: strip.accent }}>See all</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={strip.accent} strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", padding: "0 16px 4px" }}>
            {strip.posts.map(p => (
              <div key={p.id} style={{ flexShrink: 0, width: 168, background: WARM.surface, borderRadius: 14, borderLeft: `3px solid ${strip.accent}`, padding: "11px 12px", boxShadow: "0 1px 6px rgba(28,25,23,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: strip.accent + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: strip.accent, flexShrink: 0 }}>{p.author[0]}</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: WARM.text, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.author}</p>
                    <p style={{ margin: 0, fontSize: 9, color: WARM.textMuted, lineHeight: 1.2 }}>{p.time}</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 11.5, color: WARM.text, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.content}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 8 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={WARM.textMuted} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <span style={{ fontSize: 10, color: WARM.textMuted, fontWeight: 500 }}>{p.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── Feed label ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px 12px" }}>
        <div style={{ flex: 1, height: 0.5, background: WARM.border }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: WARM.textMuted, letterSpacing: "0.12em", textTransform: "uppercase" }}>Recent Posts</span>
        <div style={{ flex: 1, height: 0.5, background: WARM.border }} />
      </div>

      {/* ── Post cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px 120px" }}>
        {feedPosts.map(post => (
          <div key={post.id} style={{ background: WARM.surface, borderRadius: 16, borderLeft: `3px solid ${post.cat.accent}`, padding: "14px 14px 12px", boxShadow: "0 1px 8px rgba(28,25,23,0.05)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: gradStr(post.grad), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{post.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: WARM.text }}>{post.author}</span>
                  {post.verified && (
                    <span style={{ width: 15, height: 15, borderRadius: "50%", background: "linear-gradient(135deg, #5B4FE8, #7B73F0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: WARM.textMuted }}>{post.program} · {post.time}</span>
              </div>
              <div style={{ background: post.cat.bg, padding: "3px 9px", borderRadius: 20, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: post.cat.accent }}>{post.cat.emoji}</span>
              </div>
            </div>
            {/* Content */}
            <p style={{ margin: "0 0 10px", fontSize: 13.5, color: WARM.text, lineHeight: 1.55 }}>{post.content}</p>
            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 18, paddingTop: 10, borderTop: `0.5px solid ${WARM.borderLight}` }}>
              <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={WARM.textMuted} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span style={{ fontSize: 12, color: WARM.textMuted, fontWeight: 500 }}>{post.likes}</span>
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={WARM.textMuted} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span style={{ fontSize: 12, color: WARM.textMuted, fontWeight: 500 }}>{post.comments}</span>
              </button>
              <div style={{ flex: 1 }} />
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={WARM.textMuted} strokeWidth="2"><path d="m5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={WARM.textMuted} strokeWidth="2"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom nav ── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: "rgba(250,248,244,0.95)", backdropFilter: "blur(16px)", borderTop: `0.5px solid ${WARM.border}`, display: "flex", justifyContent: "space-around", padding: "10px 24px 22px" }}>
        {[
          { label: "Home", d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", active: true },
          { label: "Services", d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", active: false },
          { label: "Chat", d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", active: false },
          { label: "Profile", d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", active: false, extra: <circle cx="12" cy="7" r="4" /> },
        ].map(item => (
          <button key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={item.active ? WARM.primary : "none"} stroke={item.active ? WARM.primary : WARM.textMuted} strokeWidth="1.8">
              <path d={item.d} />
              {item.label === "Profile" && <circle cx="12" cy="7" r="4" />}
            </svg>
            <span style={{ fontSize: 10, fontWeight: item.active ? 700 : 500, color: item.active ? WARM.primary : WARM.textMuted }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
