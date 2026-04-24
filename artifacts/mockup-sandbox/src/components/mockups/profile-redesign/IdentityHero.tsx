import React from "react";

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
  {
    id: 1,
    content: "Just dropped my full DBMS Unit 4 notes — normalization, ACID, and 50+ practice questions. Free for all juniors.",
    likes: 142,
    comments: 38,
    date: "12 Apr",
    thumb: true,
  },
  {
    id: 2,
    content: "Anyone up for a 6am library group? Trying to lock in for end-sems. Hall B, second floor.",
    likes: 28,
    comments: 14,
    date: "9 Apr",
  },
  {
    id: 3,
    content: "Selling my old DSA textbook (Cormen) — barely used. ₹450. DM if interested.",
    likes: 9,
    comments: 6,
    date: "5 Apr",
  },
];

function Icon({ name, size = 16, color = "currentColor", stroke = 2 }: any) {
  const paths: Record<string, React.ReactNode> = {
    "edit-2": <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />,
    bell: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </>
    ),
    "log-out": (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </>
    ),
    camera: (
      <>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    "share-2": (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
    "map-pin": (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    "book-open": (
      <>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </>
    ),
    "file-text": (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
    users: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    "user-plus": (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </>
    ),
    heart: (
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    ),
    "message-circle": (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export function IdentityHero() {
  return (
    <div
      style={{
        background: C.background,
        fontFamily: "'Inter', sans-serif",
        maxWidth: 390,
        margin: "0 auto",
        minHeight: "100vh",
        color: C.text,
        position: "relative",
      }}
    >
      {/* Tall Cover Gradient */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 360,
          background: "linear-gradient(135deg, #5B4FE8 0%, #7B73F0 100%)",
          zIndex: 0,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 250,
            height: 250,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
      </div>

      {/* Content wrapper */}
      <div style={{ position: "relative", zIndex: 1, paddingBottom: 40 }}>
        {/* Top bar (transparent over gradient) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            color: "#fff",
          }}
        >
          <button
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(8px)",
              border: "none",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="edit-2" size={18} color="#fff" />
          </button>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Profile</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                border: "none",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="bell" size={18} color="#fff" />
            </button>
            <button
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: "rgba(239, 68, 68, 0.2)",
                backdropFilter: "blur(8px)",
                border: "none",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="log-out" size={18} color="#FFE4E6" />
            </button>
          </div>
        </div>

        {/* Hero Identity Center */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 20,
            padding: "0 24px",
          }}
        >
          <div style={{ position: "relative", marginBottom: 16 }}>
            {/* Avatar Ring */}
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                background: "rgba(255,255,255,0.2)",
                display: "grid",
                placeItems: "center",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              <div
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 52,
                  background: C.surface,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    background: "linear-gradient(135deg, #5B4FE8, #9F94F8)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: 32,
                    fontWeight: 700,
                  }}
                >
                  AS
                </div>
              </div>
            </div>
            {/* Camera Affordance */}
            <div
              style={{
                position: "absolute",
                bottom: 4,
                right: 4,
                width: 32,
                height: 32,
                borderRadius: 16,
                background: C.surface,
                display: "grid",
                placeItems: "center",
                border: `1px solid ${C.border}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <Icon name="camera" size={14} color={C.textSecondary} />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.5px",
              }}
            >
              {USER.name}
            </h1>
            {USER.verified && (
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  background: "#fff",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name="check" size={14} color={C.primary} stroke={3} />
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>
              {USER.email}
            </span>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.4)",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(4px)",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {USER.role}
              </span>
            </div>
          </div>

          {/* Quick Actions overlaying the gradient transition */}
          <div
            style={{
              display: "flex",
              gap: 12,
              width: "100%",
              marginTop: 8,
              marginBottom: 24,
            }}
          >
            <button
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: 24,
                background: C.surface,
                color: C.text,
                fontSize: 15,
                fontWeight: 600,
                border: "none",
                boxShadow: "0 8px 24px rgba(91, 79, 232, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Icon name="edit-2" size={16} /> Edit Profile
            </button>
            <button
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                background: C.surface,
                display: "grid",
                placeItems: "center",
                border: "none",
                boxShadow: "0 8px 24px rgba(91, 79, 232, 0.15)",
              }}
            >
              <Icon name="share-2" size={20} color={C.text} />
            </button>
          </div>
        </div>

        {/* Bio & Meta */}
        <div style={{ padding: "0 24px", marginBottom: 24 }}>
          <p
            style={{
              fontSize: 16,
              lineHeight: "24px",
              color: C.text,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {USER.bio}
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: C.textSecondary,
              }}
            >
              <Icon name="map-pin" size={14} color={C.textTertiary} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {USER.college}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: C.textSecondary,
              }}
            >
              <Icon name="book-open" size={14} color={C.textTertiary} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {USER.program}
              </span>
            </div>
          </div>
        </div>

        {/* Horizontal Pill Stats Row */}
        <div style={{ padding: "0 24px", marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              background: C.surface,
              borderRadius: 24,
              padding: "16px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
              border: `1px solid ${C.border}`,
            }}
          >
            {[
              { label: "Posts", value: USER.postsCount },
              { label: "Followers", value: USER.followersCount },
              { label: "Following", value: USER.followingCount },
            ].map((stat, i, arr) => (
              <React.Fragment key={stat.label}>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: C.text,
                    }}
                  >
                    {stat.value}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: C.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      height: 32,
                      background: C.border,
                      alignSelf: "center",
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Services Offered */}
        <div style={{ padding: "0 24px", marginBottom: 32 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.text,
              marginBottom: 12,
            }}
          >
            Services Offered
          </h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {SERVICES.map((s) => (
              <div
                key={s.label}
                style={{
                  padding: "10px 16px",
                  borderRadius: 20,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: s.color,
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.text,
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Posts Feed */}
        <div style={{ padding: "0 24px" }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.text,
              marginBottom: 16,
            }}
          >
            Recent Posts
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {POSTS.map((post) => (
              <div
                key={post.id}
                style={{
                  background: C.surface,
                  borderRadius: 24,
                  padding: "20px",
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                {post.thumb && (
                  <div
                    style={{
                      width: "100%",
                      height: 140,
                      borderRadius: 16,
                      background: "linear-gradient(135deg, #EDE9FE, #E0E7FF)",
                      display: "grid",
                      placeItems: "center",
                      color: C.primary,
                      fontSize: 14,
                      fontWeight: 700,
                      marginBottom: 16,
                    }}
                  >
                    DBMS Notes · Unit 4
                  </div>
                )}
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: "22px",
                    color: C.text,
                    marginBottom: 16,
                  }}
                >
                  {post.content}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", gap: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: C.textSecondary,
                      }}
                    >
                      <Icon name="heart" size={16} color={C.textTertiary} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {post.likes}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: C.textSecondary,
                      }}
                    >
                      <Icon
                        name="message-circle"
                        size={16}
                        color={C.textTertiary}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {post.comments}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: C.textTertiary,
                    }}
                  >
                    {post.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
