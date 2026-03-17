import { db } from "@workspace/db";
import {
  usersTable, walletsTable, chatroomsTable, postsTable
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import { generateId } from "./id";
import { eq } from "drizzle-orm";

export async function seedData() {
  // Check if seed already done
  const existingUsers = await db.select().from(usersTable).limit(1);
  if (existingUsers.length > 0) return;

  console.log("Seeding initial data...");

  // Create test users
  const users = [
    { id: generateId(), name: "Priya Sharma", email: "priya@campus.edu", passwordHash: await bcrypt.hash("password123", 10), college: "Delhi University", program: "BCA", role: "student", bio: "Coding enthusiast & UI/UX lover 🎨", followersCount: 120, followingCount: 85, postsCount: 15 },
    { id: generateId(), name: "Arjun Mehta", email: "arjun@campus.edu", passwordHash: await bcrypt.hash("password123", 10), college: "Delhi University", program: "BTech", role: "provider", bio: "Full-stack dev | Tutor | Available for assignments", followersCount: 250, followingCount: 130, postsCount: 32 },
    { id: generateId(), name: "Sneha Patel", email: "sneha@campus.edu", passwordHash: await bcrypt.hash("password123", 10), college: "Mumbai University", program: "MBA", role: "student", bio: "Business strategist | Coffee addict ☕", followersCount: 89, followingCount: 200, postsCount: 8 },
    { id: generateId(), name: "Rahul Verma", email: "rahul@campus.edu", passwordHash: await bcrypt.hash("password123", 10), college: "IIT Delhi", program: "MTech", role: "provider", bio: "Research assistant | Competitive coder | Available for tutoring", followersCount: 340, followingCount: 50, postsCount: 45 },
  ];

  await db.insert(usersTable).values(users);

  // Create wallets
  const wallets = users.map(u => ({
    id: generateId(),
    userId: u.id,
    balance: (Math.random() * 5000 + 500).toFixed(2),
    currency: "INR",
  }));
  await db.insert(walletsTable).values(wallets);

  // Create chatrooms
  const chatrooms = [
    { id: generateId(), name: "#coding", description: "Discuss programming & tech", category: "tech", memberCount: 142 },
    { id: generateId(), name: "#buy-sell", description: "Trade books, gadgets & more", category: "marketplace", memberCount: 287 },
    { id: generateId(), name: "#BCA", description: "BCA program discussion", category: "program", memberCount: 98 },
    { id: generateId(), name: "#BTech", description: "BTech program discussion", category: "program", memberCount: 213 },
    { id: generateId(), name: "#general", description: "General campus talk", category: "general", memberCount: 456 },
    { id: generateId(), name: "#placements", description: "Job & internship opportunities", category: "career", memberCount: 178 },
  ];
  await db.insert(chatroomsTable).values(chatrooms);

  // Create sample posts
  const posts = [
    { id: generateId(), content: "Just scored 98% in my Data Structures exam! 🎉 All those late-night study sessions finally paid off. Anyone needs help with DSA — DM me!", authorId: users[1].id, likesCount: 45, commentsCount: 12 },
    { id: generateId(), content: "Looking for notes on Computer Networks (Unit 3 - TCP/IP). Will pay ₹200 for good handwritten notes. Comment below! 📚", authorId: users[0].id, likesCount: 23, commentsCount: 8 },
    { id: generateId(), content: "Campus fest next week! 🎊 Who's performing at the cultural night? Drop your guesses below. Rumor has it there's a surprise guest artist!", authorId: users[2].id, likesCount: 78, commentsCount: 34 },
    { id: generateId(), content: "New Python tutorial series starting this weekend. Free sessions for first 10 registrations. Topics: Web scraping, Data analysis, ML basics. DM for details! 🐍", authorId: users[3].id, likesCount: 56, commentsCount: 19 },
    { id: generateId(), content: "Selling my old Algorithms textbook (Cormen) in great condition. ₹450 only. College hostel pickup available. First come first serve! 📖", authorId: users[1].id, likesCount: 12, commentsCount: 5 },
  ];
  await db.insert(postsTable).values(posts);

  console.log("Seed complete!");
}
