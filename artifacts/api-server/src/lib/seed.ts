import { db } from "@workspace/db";
import {
  usersTable, walletsTable, chatroomsTable, postsTable,
  assignmentsTable, coachingSessionsTable, deliveriesTable, tasksTable,
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import { generateId } from "./id";

export async function seedData() {
  const existingUsers = await db.select().from(usersTable).limit(1);
  if (existingUsers.length > 0) return;

  console.log("Seeding initial data...");

  const users = [
    { id: generateId(), name: "Priya Sharma", email: "priya@campus.edu", passwordHash: await bcrypt.hash("password123", 10), college: "Delhi University", program: "BCA", role: "student", bio: "Coding enthusiast & UI/UX lover 🎨", followersCount: 120, followingCount: 85, postsCount: 15 },
    { id: generateId(), name: "Arjun Mehta", email: "arjun@campus.edu", passwordHash: await bcrypt.hash("password123", 10), college: "Delhi University", program: "BTech", role: "provider", bio: "Full-stack dev | Tutor | Available for assignments", followersCount: 250, followingCount: 130, postsCount: 32 },
    { id: generateId(), name: "Sneha Patel", email: "sneha@campus.edu", passwordHash: await bcrypt.hash("password123", 10), college: "Mumbai University", program: "MBA", role: "student", bio: "Business strategist | Coffee addict ☕", followersCount: 89, followingCount: 200, postsCount: 8 },
    { id: generateId(), name: "Rahul Verma", email: "rahul@campus.edu", passwordHash: await bcrypt.hash("password123", 10), college: "IIT Delhi", program: "MTech", role: "provider", bio: "Research assistant | Competitive coder | Available for tutoring", followersCount: 340, followingCount: 50, postsCount: 45 },
  ];
  await db.insert(usersTable).values(users);

  const wallets = users.map(u => ({
    id: generateId(), userId: u.id,
    balance: (Math.random() * 5000 + 500).toFixed(2), currency: "INR",
  }));
  await db.insert(walletsTable).values(wallets);

  const chatrooms = [
    { id: generateId(), name: "#coding", description: "Discuss programming & tech", category: "tech", memberCount: 142 },
    { id: generateId(), name: "#buy-sell", description: "Trade books, gadgets & more", category: "marketplace", memberCount: 287 },
    { id: generateId(), name: "#BCA", description: "BCA program discussion", category: "program", memberCount: 98 },
    { id: generateId(), name: "#BTech", description: "BTech program discussion", category: "program", memberCount: 213 },
    { id: generateId(), name: "#general", description: "General campus talk", category: "general", memberCount: 456 },
    { id: generateId(), name: "#placements", description: "Job & internship opportunities", category: "career", memberCount: 178 },
  ];
  await db.insert(chatroomsTable).values(chatrooms);

  const posts = [
    { id: generateId(), content: "Just scored 98% in my Data Structures exam! 🎉 All those late-night study sessions finally paid off. Anyone needs help with DSA — DM me!", authorId: users[1].id, likesCount: 45, commentsCount: 12 },
    { id: generateId(), content: "Looking for notes on Computer Networks (Unit 3 - TCP/IP). Will pay ₹200 for good handwritten notes. Comment below! 📚", authorId: users[0].id, likesCount: 23, commentsCount: 8 },
    { id: generateId(), content: "Campus fest next week! 🎊 Who's performing at the cultural night? Drop your guesses below. Rumor has it there's a surprise guest artist!", authorId: users[2].id, likesCount: 78, commentsCount: 34 },
    { id: generateId(), content: "New Python tutorial series starting this weekend. Free sessions for first 10 registrations. Topics: Web scraping, Data analysis, ML basics. DM for details! 🐍", authorId: users[3].id, likesCount: 56, commentsCount: 19 },
    { id: generateId(), content: "Selling my old Algorithms textbook (Cormen) in great condition. ₹450 only. College hostel pickup available. First come first serve! 📖", authorId: users[1].id, likesCount: 12, commentsCount: 5 },
  ];
  await db.insert(postsTable).values(posts);

  // Assignments (posted by students, solved by providers)
  await db.insert(assignmentsTable).values([
    { id: generateId(), title: "DBMS Assignment - Normalization", description: "Need expert help with 3NF, BCNF normalization problems and ER diagrams. 5 questions total.", price: "350", deliveryMode: "pdf", subject: "DBMS", posterId: users[0].id },
    { id: generateId(), title: "Operating Systems Lab Report", description: "Write OS lab report covering scheduling algorithms, memory management with diagrams.", price: "250", deliveryMode: "pdf", subject: "OS", posterId: users[0].id },
    { id: generateId(), title: "Python Data Analysis Project", description: "Analyze a dataset using pandas/matplotlib, create 5 visualizations with insights.", price: "500", deliveryMode: "zip", subject: "Python", posterId: users[2].id },
    { id: generateId(), title: "Marketing Case Study", description: "Write 3000-word case study on Zomato marketing strategy with SWOT analysis.", price: "400", deliveryMode: "pdf", subject: "Marketing", posterId: users[2].id },
  ]);

  // Coaching sessions (offered by providers)
  await db.insert(coachingSessionsTable).values([
    { id: generateId(), title: "DSA Masterclass - Arrays & Trees", description: "Comprehensive 2-hour session covering arrays, linked lists, trees, graphs. Live problem solving.", price: "299", sessionType: "group", subject: "DSA", mentorId: users[1].id, maxStudents: 10 },
    { id: generateId(), title: "1-on-1 Python Mentoring", description: "Personal mentoring session for Python basics to advanced. Customize syllabus to your needs.", price: "499", sessionType: "one_on_one", subject: "Python", mentorId: users[1].id, maxStudents: 1 },
    { id: generateId(), title: "DBMS Interview Prep", description: "Crack database interviews. SQL queries, normalization, transactions with mock interview.", price: "199", sessionType: "group", subject: "DBMS", mentorId: users[3].id, maxStudents: 15 },
    { id: generateId(), title: "MTech Research Guidance", description: "Research methodology, paper writing, thesis guidance for MTech students.", price: "799", sessionType: "one_on_one", subject: "Research", mentorId: users[3].id, maxStudents: 1 },
  ]);

  // Deliveries (requested by students)
  await db.insert(deliveriesTable).values([
    { id: generateId(), pickupLocation: "Main Gate", dropLocation: "Boys Hostel Block C", item: "Amazon parcel (laptop bag)", requesterId: users[2].id, notes: "Handle with care please" },
    { id: generateId(), pickupLocation: "Girls Hostel", dropLocation: "Library", item: "Books (3 textbooks)", requesterId: users[0].id, notes: "Available after 2pm" },
    { id: generateId(), pickupLocation: "Canteen", dropLocation: "Computer Lab", item: "Lunch box", requesterId: users[2].id, notes: "Urgent - hot food" },
  ]);

  // Tasks (posted by students, done by anyone)
  await db.insert(tasksTable).values([
    { id: generateId(), title: "Design poster for Tech Fest", description: "Need creative A3 poster for annual tech fest. Provide PSD and PNG formats. Theme: Innovation.", budget: "300", category: "design", posterId: users[0].id },
    { id: generateId(), title: "Video editing - farewell reel", description: "Edit 2-minute farewell video from provided raw clips. Add music, transitions, text overlays.", budget: "500", category: "video", posterId: users[2].id },
    { id: generateId(), title: "Transcribe lecture recordings", description: "Transcribe 3 hours of lecture audio to text document. Accuracy required.", budget: "200", category: "content", posterId: users[0].id },
    { id: generateId(), title: "Build portfolio website", description: "Simple 5-page portfolio website using HTML/CSS/JS. Modern design with resume download.", budget: "1500", category: "development", posterId: users[2].id },
  ]);

  console.log("Seed complete! Users, wallets, chatrooms, posts, assignments, coaching, deliveries, tasks all seeded.");
}
