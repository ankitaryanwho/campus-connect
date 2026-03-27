export function Mono() {
  const posts = [
    { id: 1, author: "Riya S.", program: "BCA · 2nd Year", time: "12m ago", content: "Anyone have DBMS notes for Unit 4? Exam is in 3 days and I'm completely lost on normalization.", likes: 14, comments: 6, category: "Study" },
    { id: 2, author: "Anon", program: "BTech · 3rd Year", time: "45m ago", content: "Selling my HP laptop — 8GB RAM, i5 10th gen, barely used. ₹28,000. DM if interested.", likes: 9, comments: 12, category: "Buy/Sell" },
    { id: 3, author: "Karan M.", program: "MBA · 1st Year", time: "2h ago", content: "Workshop on 'AI in Business' this Sunday at LT-3. Registration is free. Limited seats.", likes: 31, comments: 4, category: "Events" },
    { id: 4, author: "Priya R.", program: "BCA · 3rd Year", time: "3h ago", content: "Looking for someone to collaborate on a React Native project for college fest. Any takers?", likes: 7, comments: 18, category: "Social" },
  ];

  const categories = ["All", "Study", "Events", "Buy/Sell", "Social"];

  return (
    <div className="bg-white min-h-screen font-sans" style={{ fontFamily: "'Inter', sans-serif", maxWidth: 390, margin: "0 auto" }}>
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1">
        <span className="text-xs font-semibold text-black">9:41</span>
        <div className="flex gap-1 items-center">
          <div className="w-3 h-1.5 border border-black rounded-sm"><div className="w-2 h-full bg-black rounded-sm" /></div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-black">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Campus</p>
          <h1 className="text-2xl font-black text-black leading-tight tracking-tight">Board</h1>
        </div>
        <div className="flex gap-2">
          <button className="w-9 h-9 border border-black rounded-full flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
          <button className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 px-5 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {categories.map((c, i) => (
          <button key={c} className={`shrink-0 px-3.5 py-1.5 text-xs font-semibold border rounded-full tracking-wide ${i === 0 ? "bg-black text-white border-black" : "bg-white text-black border-black"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Create post */}
      <div className="mx-5 mb-4 flex items-center gap-3 border border-black rounded-xl px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shrink-0">A</div>
        <span className="text-sm text-gray-400 flex-1">What's on your mind?</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
      </div>

      {/* Section label */}
      <div className="px-5 mb-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-black" />
        <span className="text-xs font-bold tracking-widest uppercase text-black">Recent</span>
        <div className="h-px flex-1 bg-black" />
      </div>

      {/* Posts */}
      <div className="px-5 flex flex-col gap-0">
        {posts.map((post, idx) => (
          <div key={post.id} className={`py-4 ${idx < posts.length - 1 ? "border-b border-gray-200" : ""}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {post.author === "Anon" ? "?" : post.author[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-black leading-tight">{post.author}</p>
                  <p className="text-xs text-gray-400 leading-tight">{post.program}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold border border-black px-2 py-0.5 rounded-full text-black">{post.category}</span>
                <span className="text-xs text-gray-400">{post.time}</span>
              </div>
            </div>
            <p className="text-sm text-black leading-relaxed mb-3">{post.content}</p>
            <div className="flex items-center gap-5">
              <button className="flex items-center gap-1.5 text-xs font-medium text-black">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {post.likes}
              </button>
              <button className="flex items-center gap-1.5 text-xs font-medium text-black">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {post.comments}
              </button>
              <button className="flex items-center gap-1.5 text-xs font-medium text-gray-400 ml-auto">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 12 8-8 8 8M4 12l8 8 8-8"/></svg>
                Share
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] border-t border-black bg-white px-8 py-3 flex justify-between items-center">
        {[
          { icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", label: "Home", active: true },
          { icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", label: "Services", active: false },
          { icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", label: "Chat", active: false },
          { icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", label: "Profile", active: false },
        ].map(item => (
          <button key={item.label} className="flex flex-col items-center gap-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill={item.active ? "black" : "none"} stroke="black" strokeWidth="2">
              <path d={item.icon} />
              {item.label === "Profile" && <circle cx="12" cy="7" r="4" fill={item.active ? "black" : "none"} stroke="black" strokeWidth="2" />}
            </svg>
            <span className={`text-xs font-semibold ${item.active ? "text-black" : "text-gray-400"}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
