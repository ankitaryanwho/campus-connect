import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Zap, 
  Layers, 
  X, 
  BookOpen, 
  Briefcase, 
  User, 
  MapPin, 
  ChevronDown, 
  CheckCircle2, 
  Phone, 
  Square, 
  CheckSquare, 
  ArrowRight 
} from 'lucide-react';

export function MinimalInk() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"student" | "provider">("student");
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hasError, setHasError] = useState(false); // For prototype

  const programs = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const genders = [
    { label: "Male", icon: "M" },
    { label: "Female", icon: "F" },
    { label: "Other", icon: "O" }
  ];
  
  const servicesList = [
    { id: "assignments", label: "Assignments", icon: "📝" },
    { id: "certifications", label: "Certifications", icon: "🏆" },
    { id: "deliveries", label: "Deliveries", icon: "🚚" },
    { id: "tasks", label: "Tasks & Gigs", icon: "⚡" }
  ];

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter(s => s !== id));
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const simulateError = () => {
    setHasError(true);
    setTimeout(() => setHasError(false), 3000);
  };

  return (
    <div className="max-w-[390px] mx-auto h-[844px] overflow-hidden relative font-['Inter'] bg-[#FAF8F4] text-[#1A1A2E]">
      <div className="h-full overflow-y-auto hide-scrollbar pb-10">
        
        {/* LOGIN MODE */}
        {mode === "login" && (
          <div className="px-6 pt-20 pb-10 min-h-full flex flex-col">
            <div className="flex flex-col items-center mb-16">
              <div className="flex items-center gap-1.5 bg-[#5B4FE8]/10 px-3 py-1 rounded-full mb-6">
                <Layers size={14} className="text-[#5B4FE8]" />
                <span className="text-[12px] font-semibold text-[#5B4FE8]">Colyx</span>
              </div>
              <h1 className="text-[32px] font-bold mb-2">Welcome back</h1>
              <p className="text-[14px] text-[#1A1A2E]/55 text-center">Enter your details to access your account.</p>
            </div>

            {hasError && (
              <div className="bg-red-50 text-[#EF4444] p-3 rounded-xl flex items-start gap-2 mb-6 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>Invalid email or password. Please try again.</p>
              </div>
            )}

            <div className="space-y-6 mb-8">
              <div className="relative group">
                <label className="text-[11px] uppercase tracking-widest text-[#1A1A2E]/55 font-semibold mb-1 block">College Email</label>
                <div className="flex items-center border-b border-[#E8E4F0] pb-2 group-focus-within:border-[#5B4FE8] group-focus-within:border-b-2 transition-all">
                  <Mail size={20} className="text-[#1A1A2E]/40 mr-3" />
                  <input 
                    type="email" 
                    placeholder="your@college.edu" 
                    className="w-full bg-transparent outline-none placeholder:text-[#1A1A2E]/30 text-[15px]"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="text-[11px] uppercase tracking-widest text-[#1A1A2E]/55 font-semibold mb-1 block">Password</label>
                <div className="flex items-center border-b border-[#E8E4F0] pb-2 group-focus-within:border-[#5B4FE8] group-focus-within:border-b-2 transition-all">
                  <Lock size={20} className="text-[#1A1A2E]/40 mr-3" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="w-full bg-transparent outline-none placeholder:text-[#1A1A2E]/30 text-[15px]"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-[#1A1A2E]/40 hover:text-[#1A1A2E]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="text-[13px] font-medium text-[#5B4FE8]">Forgot password?</button>
              </div>
            </div>

            <button 
              onClick={simulateError}
              className="w-full h-[56px] rounded-full bg-gradient-to-r from-[#5B4FE8] to-[#7C6FFF] text-white font-bold text-[16px] shadow-[0_8px_20px_rgba(91,79,232,0.25)] flex items-center justify-center mb-8"
            >
              Sign In
            </button>

            <div className="flex items-center mb-8">
              <div className="h-px bg-[#E8E4F0] flex-1"></div>
              <span className="px-4 text-[13px] text-[#1A1A2E]/40">or</span>
              <div className="h-px bg-[#E8E4F0] flex-1"></div>
            </div>

            <button className="w-full py-3 flex items-center justify-center gap-2 text-[#5B4FE8] font-semibold text-[15px]">
              <Zap size={18} />
              Use demo account
            </button>

            <div className="mt-auto pt-10 text-center">
              <span className="text-[#1A1A2E]/55 text-[14px]">Don't have an account? </span>
              <button 
                onClick={() => setMode("signup")}
                className="text-[#5B4FE8] font-bold text-[14px]"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* SIGNUP MODE */}
        {mode === "signup" && (
          <div className="px-6 pt-16 pb-12">
            <button 
              onClick={() => setMode("login")}
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-8 border border-[#E8E4F0]"
            >
              <X size={20} className="text-[#1A1A2E]" />
            </button>

            <h1 className="text-[32px] font-bold mb-8">Join us</h1>

            <div className="grid grid-cols-2 gap-3 mb-10">
              <button 
                onClick={() => setRole("student")}
                className={`p-4 rounded-2xl flex flex-col items-start text-left transition-all ${
                  role === "student" 
                    ? "border-l-4 border-l-[#5B4FE8] bg-[#5B4FE8]/5 border-y border-r border-[#5B4FE8]/10" 
                    : "border border-[#E8E4F0] bg-white"
                }`}
              >
                <div className={`p-2 rounded-full mb-3 ${role === "student" ? "bg-[#5B4FE8]/10 text-[#5B4FE8]" : "bg-gray-100 text-[#1A1A2E]/40"}`}>
                  <BookOpen size={20} />
                </div>
                <span className={`font-bold text-[15px] ${role === "student" ? "text-[#5B4FE8]" : "text-[#1A1A2E]"}`}>Student</span>
                <span className="text-[12px] text-[#1A1A2E]/55 mt-1">Learn & request</span>
              </button>

              <button 
                onClick={() => setRole("provider")}
                className={`p-4 rounded-2xl flex flex-col items-start text-left transition-all ${
                  role === "provider" 
                    ? "border-l-4 border-l-[#5B4FE8] bg-[#5B4FE8]/5 border-y border-r border-[#5B4FE8]/10" 
                    : "border border-[#E8E4F0] bg-white"
                }`}
              >
                <div className={`p-2 rounded-full mb-3 ${role === "provider" ? "bg-[#5B4FE8]/10 text-[#5B4FE8]" : "bg-gray-100 text-[#1A1A2E]/40"}`}>
                  <Briefcase size={20} />
                </div>
                <span className={`font-bold text-[15px] ${role === "provider" ? "text-[#5B4FE8]" : "text-[#1A1A2E]"}`}>Provider</span>
                <span className="text-[12px] text-[#1A1A2E]/55 mt-1">Earn on campus</span>
              </button>
            </div>

            <div className="space-y-8 mb-10">
              <div className="relative group">
                <label className="text-[11px] uppercase tracking-widest text-[#1A1A2E]/55 font-semibold mb-1 block">Full Name</label>
                <div className="flex items-center border-b border-[#E8E4F0] pb-2 group-focus-within:border-[#5B4FE8] group-focus-within:border-b-2 transition-all">
                  <User size={20} className="text-[#1A1A2E]/40 mr-3" />
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    className="w-full bg-transparent outline-none placeholder:text-[#1A1A2E]/30 text-[15px]"
                  />
                </div>
              </div>

              <div className="relative group cursor-pointer">
                <label className="text-[11px] uppercase tracking-widest text-[#1A1A2E]/55 font-semibold mb-1 block">College</label>
                <div className="flex items-center border-b border-[#E8E4F0] pb-2">
                  <MapPin size={20} className="text-[#1A1A2E]/40 mr-3" />
                  <span className="w-full text-[#1A1A2E]/30 text-[15px]">Select your college</span>
                  <ChevronDown size={20} className="text-[#1A1A2E]/40" />
                </div>
              </div>

              <div className="relative group">
                <label className="text-[11px] uppercase tracking-widest text-[#1A1A2E]/55 font-semibold mb-1 block">College Email</label>
                <div className="flex items-center border-b border-[#E8E4F0] pb-2 group-focus-within:border-[#5B4FE8] group-focus-within:border-b-2 transition-all">
                  <Mail size={20} className="text-[#1A1A2E]/40 mr-3" />
                  <input 
                    type="email" 
                    placeholder="student@college.edu" 
                    className="w-full bg-transparent outline-none placeholder:text-[#1A1A2E]/30 text-[15px]"
                  />
                  <CheckCircle2 size={18} className="text-[#10B981] opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="relative group">
                <label className="text-[11px] uppercase tracking-widest text-[#1A1A2E]/55 font-semibold mb-1 block">Password</label>
                <div className="flex items-center border-b border-[#E8E4F0] pb-2 group-focus-within:border-[#5B4FE8] group-focus-within:border-b-2 transition-all">
                  <Lock size={20} className="text-[#1A1A2E]/40 mr-3" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Create a password" 
                    className="w-full bg-transparent outline-none placeholder:text-[#1A1A2E]/30 text-[15px]"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-[#1A1A2E]/40 hover:text-[#1A1A2E]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="relative group">
                <label className="text-[11px] uppercase tracking-widest text-[#1A1A2E]/55 font-semibold mb-1 block">Phone (Optional)</label>
                <div className="flex items-center border-b border-[#E8E4F0] pb-2 group-focus-within:border-[#5B4FE8] group-focus-within:border-b-2 transition-all">
                  <Phone size={20} className="text-[#1A1A2E]/40 mr-3" />
                  <input 
                    type="tel" 
                    placeholder="+91 98765 43210" 
                    className="w-full bg-transparent outline-none placeholder:text-[#1A1A2E]/30 text-[15px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-[#1A1A2E]/55 font-semibold mb-3 block">Program</label>
                <div className="flex flex-wrap gap-2">
                  {programs.map(prog => (
                    <button
                      key={prog}
                      onClick={() => setSelectedProgram(prog)}
                      className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                        selectedProgram === prog 
                          ? "bg-[#5B4FE8] text-white" 
                          : "bg-[#5B4FE8]/10 text-[#1A1A2E]/70 hover:bg-[#5B4FE8]/20"
                      }`}
                    >
                      {prog}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-[#1A1A2E]/55 font-semibold mb-3 block">Academic Year</label>
                <div className="flex flex-wrap gap-2">
                  {years.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                        selectedYear === year 
                          ? "bg-[#5B4FE8] text-white" 
                          : "bg-[#5B4FE8]/10 text-[#1A1A2E]/70 hover:bg-[#5B4FE8]/20"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-[#1A1A2E]/55 font-semibold mb-3 block">Gender (Optional)</label>
                <div className="flex flex-wrap gap-2">
                  {genders.map(g => (
                    <button
                      key={g.label}
                      onClick={() => setSelectedGender(g.label)}
                      className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors flex items-center gap-1.5 ${
                        selectedGender === g.label 
                          ? "bg-[#5B4FE8] text-white" 
                          : "bg-[#5B4FE8]/10 text-[#1A1A2E]/70 hover:bg-[#5B4FE8]/20"
                      }`}
                    >
                      <span className="opacity-60 text-[10px]">{g.icon}</span>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {role === "provider" && (
                <div className="pt-4 border-t border-[#E8E4F0]">
                  <label className="text-[11px] uppercase tracking-widest text-[#1A1A2E]/55 font-semibold mb-4 block">Services you offer</label>
                  <div className="space-y-3">
                    {servicesList.map(service => (
                      <button 
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className="w-full flex items-center bg-white p-4 rounded-xl border border-[#E8E4F0] hover:border-[#5B4FE8]/50 transition-colors"
                      >
                        <div className="mr-3 text-xl">{service.icon}</div>
                        <span className="flex-1 text-left font-medium text-[15px]">{service.label}</span>
                        {selectedServices.includes(service.id) ? (
                          <CheckSquare size={20} className="text-[#5B4FE8]" />
                        ) : (
                          <Square size={20} className="text-[#1A1A2E]/20" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="w-full h-[56px] rounded-full bg-gradient-to-r from-[#5B4FE8] to-[#7C6FFF] text-white font-bold text-[16px] shadow-[0_8px_20px_rgba(91,79,232,0.25)] flex items-center justify-center gap-2 mb-8">
              Continue
              <ArrowRight size={20} />
            </button>

            <div className="text-center">
              <span className="text-[#1A1A2E]/55 text-[14px]">Already have an account? </span>
              <button 
                onClick={() => setMode("login")}
                className="text-[#5B4FE8] font-bold text-[14px]"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
