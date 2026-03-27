export function Soft() {
  const posts = [
    { id: 1, author: "Riya S.", initials: "RS", program: "BCA · 2nd Year", time: "12m ago", content: "Anyone have DBMS notes for Unit 4? Exam in 3 days and I'm completely lost.", likes: 14, comments: 6, color: "#6366F1", bg: "#EEF2FF", tag: "Study" },
    { id: 2, author: "Anonymous", initials: "?", program: "BTech · 3rd Year", time: "45m ago", content: "Selling HP laptop — i5 10th gen, 8GB RAM. Barely used. ₹28,000.", likes: 9, comments: 12, color: "#F59E0B", bg: "#FFFBEB", tag: "Sell" },
    { id: 3, author: "Karan M.", initials: "KM", program: "MBA · 1st Year", time: "2h ago", content: "Free workshop 'AI in Business' this Sunday, LT-3. Very limited seats.", likes: 31, comments: 4, color: "#8B5CF6", bg: "#F5F3FF", tag: "Event" },
    { id: 4, author: "Priya R.", initials: "PR", program: "BCA · 3rd Year", time: "3h ago", content: "Looking for a React Native collaborator for the college fest project.", likes: 7, comments: 18, color: "#10B981", bg: "#ECFDF5", tag: "Social" },
  ];

  return (
    <div className="min-h-screen font-sans" style={{ background: "#F5F5F7", fontFamily: "'Inter', sans-serif", maxWidth: 390, margin: "0 auto" }}>
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1">
        <span className="text-xs font-semibold text-gray-800">9:41</span>
        <div className="flex gap-0.5 items-end">
          <div className="w-1 h-2 rounded-sm bg-gray-800" />
          <div className="w-1 h-3 rounded-sm bg-gray-800" />
          <div className="w-1 h-4 rounded-sm bg-gray-800" />
        </div>
      </div>

      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 tracking-wide">Good morning</p>
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">Campus Board</h1>
          </div>
          <div className="flex gap-2 mt-1">
            <button className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <button className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "#6366F1", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {[
          { label: "All", color: "#6366F1", bg: "#EEF2FF", active: true },
          { label: "📚 Study", color: "#3B82F6", bg: "#EFF6FF", active: false },
          { label: "🎪 Events", color: "#8B5CF6", bg: "#F5F3FF", active: false },
          { label: "🛒 Market", color: "#F59E0B", bg: "#FFFBEB", active: false },
          { label: "💬 Social", color: "#10B981", bg: "#ECFDF5", active: false },
        ].map(cat => (
          <button key={cat.label} className="shrink-0 px-3.5 py-1.5 text-xs font-semibold rounded-full" style={{
            background: cat.active ? cat.color : "rgba(255,255,255,0.9)",
            color: cat.active ? "#fff" : "#666",
            boxShadow: cat.active ? `0 2px 8px ${cat.color}44` : "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Create */}
      <div className="mx-5 mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>A</div>
        <span className="text-sm text-gray-400 flex-1">Share something with campus…</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
      </div>

      {/* Section label */}
      <div className="px-5 mb-3">
        <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Recent Posts</p>
      </div>

      {/* Posts */}
      <div className="px-5 flex flex-col gap-3 pb-24">
        {posts.map(post => (
          <div key={post.id} className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ background: `linear-gradient(135deg, ${post.color}, ${post.color}88)` }}>
                {post.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{post.author}</p>
                <p className="text-xs text-gray-400 leading-tight">{post.program}</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: post.bg, color: post.color }}>{post.tag}</span>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed mb-3">{post.content}</p>

            <div className="flex items-center gap-4 pt-2.5" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
              <button className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {post.likes}
              </button>
              <button className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {post.comments}
              </button>
              <button className="ml-auto text-gray-300">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-6 py-4 flex justify-around items-center" style={{ background: "rgba(245,245,247,0.95)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        {[
          { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", label: "Home", active: true },
          { d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", label: "Services", active: false },
          { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", label: "Chat", active: false },
          { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", label: "Profile", active: false },
        ].map((item) => (
          <button key={item.label} className="flex flex-col items-center gap-1">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.active ? "" : ""}`} style={{ background: item.active ? "#6366F1" : "transparent", boxShadow: item.active ? "0 4px 12px rgba(99,102,241,0.25)" : "none" }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={item.active ? "white" : "#999"} strokeWidth="1.8">
                <path d={item.d} />
                {item.label === "Profile" && <circle cx="12" cy="7" r="4" stroke={item.active ? "white" : "#999"} strokeWidth="1.8" />}
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
