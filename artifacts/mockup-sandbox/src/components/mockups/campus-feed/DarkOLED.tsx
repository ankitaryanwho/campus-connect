export function DarkOLED() {
  const posts = [
    { id: 1, author: "Riya S.", program: "BCA · 2nd Year", time: "12m", content: "Anyone have DBMS notes for Unit 4? Exam in 3 days and I'm lost on normalization.", likes: 14, comments: 6, category: "study", dot: "#3B82F6" },
    { id: 2, author: "Anon", program: "BTech · 3rd Year", time: "45m", content: "Selling HP laptop — 8GB RAM, i5 10th gen, barely used. ₹28,000. DM.", likes: 9, comments: 12, category: "sell", dot: "#F59E0B" },
    { id: 3, author: "Karan M.", program: "MBA · 1st Year", time: "2h", content: "Workshop 'AI in Business' this Sunday at LT-3. Free entry. Limited seats.", likes: 31, comments: 4, category: "event", dot: "#8B5CF6" },
    { id: 4, author: "Priya R.", program: "BCA · 3rd Year", time: "3h", content: "Looking for React Native collab for college fest project. Any takers?", likes: 7, comments: 18, category: "social", dot: "#10B981" },
  ];

  const tabs = ["Feed", "Study", "Events", "Market", "Social"];

  return (
    <div className="min-h-screen font-sans" style={{ background: "#000", fontFamily: "'Inter', sans-serif", maxWidth: 390, margin: "0 auto", color: "#fff" }}>
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1">
        <span className="text-xs font-semibold">9:41</span>
        <div className="flex gap-1 items-center text-xs">●●●</div>
      </div>

      {/* Header */}
      <div className="px-5 pt-4 pb-5">
        <p className="text-xs font-medium tracking-widest" style={{ color: "#3B82F6" }}>CAMPUS CONNECT</p>
        <div className="flex items-end justify-between mt-0.5">
          <h1 className="text-3xl font-black tracking-tight leading-none">Board</h1>
          <div className="flex gap-2 pb-1">
            <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#111", border: "1px solid #222" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#3B82F6" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-5 pb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {tabs.map((t, i) => (
          <button key={t} className="shrink-0 px-3.5 py-1.5 text-xs font-semibold rounded-full" style={{
            background: i === 0 ? "#3B82F6" : "#111",
            color: i === 0 ? "#fff" : "#666",
            border: i === 0 ? "none" : "1px solid #222"
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Compose box */}
      <div className="mx-5 mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#3B82F6" }}>A</div>
        <span className="text-sm flex-1" style={{ color: "#333" }}>What's happening on campus?</span>
        <button className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "#3B82F6", color: "#fff" }}>Post</button>
      </div>

      {/* Posts */}
      <div className="px-5 flex flex-col gap-3">
        {posts.map(post => (
          <div key={post.id} className="p-4 rounded-2xl" style={{ background: "#0a0a0a", border: "1px solid #141414" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: post.dot + "22", color: post.dot }}>
                {post.author === "Anon" ? "?" : post.author[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white leading-tight">{post.author}</p>
                <p className="text-xs leading-tight" style={{ color: "#444" }}>{post.program}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: post.dot }} />
                <span className="text-xs" style={{ color: "#333" }}>{post.time}</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-3" style={{ color: "#ccc" }}>{post.content}</p>

            <div className="flex items-center gap-4 pt-2" style={{ borderTop: "1px solid #161616" }}>
              <button className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#444" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {post.likes}
              </button>
              <button className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#444" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {post.comments}
              </button>
              <button className="ml-auto" style={{ color: "#333" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-8 py-4 flex justify-around items-center" style={{ background: "#000", borderTop: "1px solid #111" }}>
        {[
          { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", active: true },
          { d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", active: false },
          { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", active: false },
          { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", active: false },
        ].map((item, i) => (
          <button key={i} className="p-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill={item.active ? "#3B82F6" : "none"} stroke={item.active ? "#3B82F6" : "#333"} strokeWidth="1.8">
              <path d={item.d} />
              {i === 3 && <circle cx="12" cy="7" r="4" stroke={item.active ? "#3B82F6" : "#333"} strokeWidth="1.8" />}
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
