export function Editorial() {
  const today = "Friday, 27 March";
  const posts = [
    { id: 1, author: "Riya S.", col: "ACADEMICS", time: "12:04 PM", content: "Anyone have DBMS notes for Unit 4? Exam in 3 days and I'm completely lost on normalization.", likes: 14, comments: 6, lead: true },
    { id: 2, author: "Anonymous", col: "MARKETPLACE", time: "11:21 AM", content: "Selling HP laptop — i5 10th gen, 8GB RAM, barely used. ₹28,000. DM.", likes: 9, comments: 12, lead: false },
    { id: 3, author: "Karan M.", col: "EVENTS", time: "10:30 AM", content: "Free workshop 'AI in Business' this Sunday, LT-3. Very limited seats — register now.", likes: 31, comments: 4, lead: false },
    { id: 4, author: "Priya R.", col: "SOCIAL", time: "9:15 AM", content: "Looking for React Native collaborator for the college fest project. Reach out!", likes: 7, comments: 18, lead: false },
  ];

  const colColor: Record<string, string> = {
    ACADEMICS: "#000",
    MARKETPLACE: "#B45309",
    EVENTS: "#5B21B6",
    SOCIAL: "#065F46",
  };

  return (
    <div className="min-h-screen font-serif" style={{ background: "#FAFAF8", fontFamily: "Georgia, 'Times New Roman', serif", maxWidth: 390, margin: "0 auto" }}>
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
        <span className="text-xs font-semibold text-gray-700">9:41</span>
        <span className="text-xs text-gray-400">●●●</span>
      </div>

      {/* Masthead */}
      <div className="px-5 pt-3 pb-3" style={{ borderBottom: "3px solid #000" }}>
        <div className="flex items-end justify-between mb-1">
          <span className="text-xs font-sans font-medium text-gray-400" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.08em" }}>{today}</span>
          <span className="text-xs font-sans font-medium text-gray-400" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.08em" }}>Vol. 3, No. 42</span>
        </div>
        <h1 className="text-3xl font-black text-center tracking-tight leading-none" style={{ fontFamily: "Georgia, serif" }}>Campus Chronicle</h1>
        <div className="h-px bg-gray-300 mt-2" />
        <p className="text-center text-xs text-gray-400 mt-1.5" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.1em", fontStyle: "italic" }}>The Voice of Your Campus Community</p>
      </div>

      {/* Section tabs */}
      <div className="flex overflow-x-auto" style={{ borderBottom: "1px solid #000", scrollbarWidth: "none" }}>
        {["All", "Academics", "Events", "Market", "Social"].map((t, i) => (
          <button key={t} className="shrink-0 px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider" style={{
            fontFamily: "'Inter', sans-serif",
            borderRight: "1px solid #000",
            background: i === 0 ? "#000" : "transparent",
            color: i === 0 ? "#fff" : "#000",
            letterSpacing: "0.1em",
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Compose */}
      <div className="mx-5 mt-4 mb-4 flex items-center gap-3 px-3 py-2.5 rounded" style={{ border: "1px solid #000", background: "#fff" }}>
        <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ fontFamily: "'Inter', sans-serif" }}>A</div>
        <span className="text-sm text-gray-400 flex-1 italic">Write a dispatch…</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </div>

      {/* Posts */}
      <div className="px-5 pb-28">
        {/* Lead story */}
        {posts.filter(p => p.lead).map(post => (
          <div key={post.id} className="mb-4 pb-4" style={{ borderBottom: "2px solid #000" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-sans font-black uppercase tracking-widest px-2 py-0.5" style={{ background: "#000", color: "#fff", fontFamily: "'Inter', sans-serif", letterSpacing: "0.15em" }}>
                {post.col}
              </span>
              <span className="text-xs font-sans text-gray-400" style={{ fontFamily: "'Inter', sans-serif" }}>{post.time}</span>
            </div>
            <p className="text-base leading-snug mb-2 font-serif" style={{ fontFamily: "Georgia, serif" }}>{post.content}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-sans font-semibold text-gray-600" style={{ fontFamily: "'Inter', sans-serif" }}>— {post.author}</span>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-2" style={{ borderTop: "1px solid #e5e5e5" }}>
              <button className="flex items-center gap-1.5 text-xs font-sans font-medium text-gray-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {post.likes} reactions
              </button>
              <button className="flex items-center gap-1.5 text-xs font-sans font-medium text-gray-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {post.comments} replies
              </button>
            </div>
          </div>
        ))}

        {/* Secondary stories */}
        <div className="grid grid-cols-2 gap-3">
          {posts.filter(p => !p.lead).map(post => (
            <div key={post.id} className="pb-3" style={{ borderBottom: `2px solid ${colColor[post.col] || "#000"}` }}>
              <span className="text-xs font-sans font-black uppercase tracking-widest block mb-1.5" style={{ color: colColor[post.col] || "#000", fontFamily: "'Inter', sans-serif", letterSpacing: "0.12em", fontSize: "0.6rem" }}>
                {post.col}
              </span>
              <p className="text-xs leading-snug mb-2" style={{ fontFamily: "Georgia, serif", fontSize: "0.78rem" }}>{post.content}</p>
              <p className="text-xs font-sans text-gray-400" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem" }}>— {post.author} · {post.time}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-sans text-gray-400" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem" }}>♥ {post.likes}</span>
                <span className="text-xs font-sans text-gray-400" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem" }}>✉ {post.comments}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] flex justify-around items-center py-3 bg-white" style={{ borderTop: "2px solid #000", fontFamily: "'Inter', sans-serif" }}>
        {["Home", "Services", "Chat", "Profile"].map((label, i) => (
          <button key={label} className="flex flex-col items-center gap-0.5">
            <div className={`text-xs font-bold uppercase tracking-wider ${i === 0 ? "text-black" : "text-gray-300"}`} style={{ fontSize: "0.6rem", letterSpacing: "0.12em" }}>{label}</div>
            {i === 0 && <div className="w-4 h-0.5 bg-black" />}
          </button>
        ))}
      </div>
    </div>
  );
}
