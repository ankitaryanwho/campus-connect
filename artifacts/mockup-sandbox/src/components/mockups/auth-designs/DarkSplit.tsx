import React, { useState } from 'react';
import { 
  Mail, Lock, Eye, EyeOff, AlertCircle, Zap, 
  Book, Briefcase, User, MapPin, ChevronDown, 
  Check, X, Phone, ArrowRight 
} from 'lucide-react';

export function DarkSplit() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"student" | "provider">("student");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [error, setError] = useState(false);

  const programs = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const genders = [
    { label: "Male", icon: "M" },
    { label: "Female", icon: "F" },
    { label: "Other", icon: "O" }
  ];
  const servicesList = [
    { id: "assignments", label: "📝 Assignments" },
    { id: "certifications", label: "🏆 Certifications" },
    { id: "deliveries", label: "🚚 Deliveries" },
    { id: "tasks", label: "⚡ Tasks & Gigs" }
  ];

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-[390px] mx-auto h-[844px] overflow-hidden relative font-['Inter'] bg-[#1A1A2E] flex flex-col shadow-2xl">
      
      {/* TOP PANEL - Fixed 38% */}
      <div className="h-[38%] flex flex-col items-center justify-between pt-8 pb-10 relative px-6 z-0 shrink-0">
        {/* Monogram */}
        <div className="absolute top-8 left-6 w-8 h-8 rounded-lg bg-[#5B4FE8] flex items-center justify-center text-white font-bold text-sm">
          CC
        </div>

        {/* Decorative dots */}
        <div className="absolute top-10 right-8 flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#5B4FE8]/50"></div>
          <div className="w-2 h-2 rounded-full bg-[#5B4FE8]/50 translate-y-2"></div>
          <div className="w-2 h-2 rounded-full bg-[#5B4FE8]/50"></div>
        </div>

        {/* Center Branding */}
        <div className="flex flex-col items-center mt-12">
          <h1 className="text-white font-bold text-[22px] tracking-tight">CampusConnect</h1>
          <p className="text-white/60 text-[13px] mt-1">Your campus, your community</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-[#1A1A2E] gap-3 mt-auto w-full max-w-[240px]">
          <button 
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 rounded-full text-sm transition-all duration-300 ${
              mode === "login" 
                ? "bg-white text-[#1A1A2E] font-semibold" 
                : "border border-white/20 text-white/80 hover:bg-white/5"
            }`}
          >
            Sign In
          </button>
          <button 
            onClick={() => setMode("signup")}
            className={`flex-1 py-2.5 rounded-full text-sm transition-all duration-300 ${
              mode === "signup" 
                ? "bg-white text-[#1A1A2E] font-semibold" 
                : "border border-white/20 text-white/80 hover:bg-white/5"
            }`}
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* BOTTOM CARD - Scrollable 62% */}
      <div className="h-[62%] bg-white rounded-t-[28px] overflow-hidden flex flex-col relative z-10 shrink-0">
        <div className="flex-1 overflow-y-auto pb-8">
          
          {/* Drag Handle */}
          <div className="w-12 h-1 bg-[#E8E4F0] rounded-full mx-auto mt-4 mb-6"></div>

          {mode === "login" ? (
            <div className="px-6 flex flex-col">
              <h2 className="text-[22px] font-bold text-[#1A1A2E]">Hello again 👋</h2>
              <p className="text-[#1A1A2E]/55 text-[13px] mt-1 mb-8">Great to see you back</p>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">Incorrect email or password. Please try again.</p>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div className="bg-[#FAF8F4] border border-[#E8E4F0] rounded-2xl flex items-center px-4 py-3.5 gap-3 transition-colors focus-within:border-[#5B4FE8] focus-within:bg-white">
                  <div className="bg-[#F0F0F5] w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-[#1A1A2E]/60" />
                  </div>
                  <input 
                    type="email" 
                    placeholder="your@college.edu" 
                    className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#1A1A2E] placeholder:text-[#1A1A2E]/40"
                  />
                </div>

                <div className="bg-[#FAF8F4] border border-[#E8E4F0] rounded-2xl flex items-center px-4 py-3.5 gap-3 transition-colors focus-within:border-[#5B4FE8] focus-within:bg-white">
                  <div className="bg-[#F0F0F5] w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-[#1A1A2E]/60" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 tracking-wider"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 shrink-0"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-[#1A1A2E]/40" />
                    ) : (
                      <Eye className="w-5 h-5 text-[#1A1A2E]/40" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end mt-3 mb-8">
                <button className="text-sm text-[#5B4FE8] font-medium">Forgot Password?</button>
              </div>

              <button className="w-full bg-[#1A1A2E] text-white rounded-2xl py-4 font-semibold text-[15px] shadow-[0_4px_14px_rgba(26,26,46,0.15)] active:scale-[0.98] transition-transform">
                Sign In
              </button>

              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-[#E8E4F0]"></div>
                <span className="text-[13px] text-[#1A1A2E]/40 uppercase tracking-widest font-medium">OR</span>
                <div className="flex-1 h-px bg-[#E8E4F0]"></div>
              </div>

              <button 
                onClick={() => setError(false)}
                className="w-full border border-dashed border-[#E8E4F0] rounded-2xl py-3.5 px-4 flex items-center justify-center gap-2 hover:bg-[#FAF8F4] transition-colors active:scale-[0.98]"
              >
                <Zap className="w-4 h-4 text-[#5B4FE8]" />
                <span className="text-[14px] text-[#5B4FE8] font-medium">Use demo account</span>
              </button>

              <div className="mt-10 text-center">
                <p className="text-[14px] text-[#1A1A2E]/60">
                  Don't have an account?{' '}
                  <button onClick={() => setMode("signup")} className="text-[#5B4FE8] font-semibold hover:underline">
                    Sign Up
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="px-6 flex flex-col pb-6">
              <h2 className="text-[22px] font-bold text-[#1A1A2E]">Nice to meet you 🎉</h2>
              <p className="text-[#1A1A2E]/55 text-[13px] mt-1 mb-6">Let's get your account set up</p>

              {/* Role Toggle */}
              <div className="bg-[#F0F0F5] rounded-full p-1.5 flex mb-6">
                <button 
                  onClick={() => setRole("student")}
                  className={`flex-1 py-2.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    role === "student" ? "bg-white text-[#1A1A2E] shadow-sm" : "text-[#1A1A2E]/50 hover:text-[#1A1A2E]"
                  }`}
                >
                  <Book className="w-4 h-4" /> Student
                </button>
                <button 
                  onClick={() => setRole("provider")}
                  className={`flex-1 py-2.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    role === "provider" ? "bg-[#5B4FE8] text-white shadow-sm" : "text-[#1A1A2E]/50 hover:text-[#1A1A2E]"
                  }`}
                >
                  <Briefcase className="w-4 h-4" /> Service Provider
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-[#FAF8F4] border border-[#E8E4F0] rounded-2xl flex items-center px-4 py-3.5 gap-3">
                  <div className="bg-[#F0F0F5] w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#1A1A2E]/60" />
                  </div>
                  <input type="text" placeholder="Full Name" className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#1A1A2E] placeholder:text-[#1A1A2E]/40" />
                </div>

                <div className="bg-[#FAF8F4] border border-[#E8E4F0] rounded-2xl flex items-center px-4 py-3.5 gap-3">
                  <div className="bg-[#F0F0F5] w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-[#1A1A2E]/60" />
                  </div>
                  <div className="flex-1 text-[15px] text-[#1A1A2E]/40">Select your college</div>
                  <ChevronDown className="w-4 h-4 text-[#1A1A2E]/40 shrink-0" />
                </div>

                <div className="bg-[#FAF8F4] border border-[#E8E4F0] rounded-2xl flex items-center px-4 py-3.5 gap-3 relative">
                  <div className="bg-[#F0F0F5] w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-[#1A1A2E]/60" />
                  </div>
                  <input type="email" placeholder="College Email (.edu)" className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 pr-8" />
                  <X className="w-4 h-4 text-red-400 shrink-0 absolute right-4" />
                </div>

                <div className="bg-[#FAF8F4] border border-[#E8E4F0] rounded-2xl flex items-center px-4 py-3.5 gap-3">
                  <div className="bg-[#F0F0F5] w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-[#1A1A2E]/60" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 tracking-wider"
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="p-1 shrink-0">
                    {showPassword ? <EyeOff className="w-5 h-5 text-[#1A1A2E]/40" /> : <Eye className="w-5 h-5 text-[#1A1A2E]/40" />}
                  </button>
                </div>

                <div className="bg-[#FAF8F4] border border-[#E8E4F0] rounded-2xl flex items-center px-4 py-3.5 gap-3">
                  <div className="bg-[#F0F0F5] w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-[#1A1A2E]/60" />
                  </div>
                  <input type="tel" placeholder="Phone Number (Optional)" className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#1A1A2E] placeholder:text-[#1A1A2E]/40" />
                </div>
              </div>

              {/* Scrollable Selectors */}
              <div className="mt-6">
                <label className="text-[13px] font-semibold text-[#1A1A2E] mb-3 block">Program</label>
                <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-6 px-6">
                  {programs.map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedProgram(p)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        selectedProgram === p 
                          ? "bg-[#1A1A2E] text-white border-[#1A1A2E]" 
                          : "bg-white text-[#1A1A2E]/70 border-[#E8E4F0] hover:bg-[#FAF8F4]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[13px] font-semibold text-[#1A1A2E] mb-3 block">Year</label>
                <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-6 px-6">
                  {years.map(y => (
                    <button
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        selectedYear === y 
                          ? "bg-[#1A1A2E] text-white border-[#1A1A2E]" 
                          : "bg-white text-[#1A1A2E]/70 border-[#E8E4F0] hover:bg-[#FAF8F4]"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[13px] font-semibold text-[#1A1A2E] mb-3 block">Gender <span className="text-[#1A1A2E]/40 font-normal">(Optional)</span></label>
                <div className="flex gap-2">
                  {genders.map(g => (
                    <button
                      key={g.label}
                      onClick={() => setSelectedGender(g.label)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                        selectedGender === g.label 
                          ? "bg-[#1A1A2E] text-white border-[#1A1A2E]" 
                          : "bg-white text-[#1A1A2E]/70 border-[#E8E4F0] hover:bg-[#FAF8F4]"
                      }`}
                    >
                      <span className="text-[10px] bg-[#1A1A2E]/10 rounded px-1.5 py-0.5">{g.icon}</span> {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {role === "provider" && (
                <div className="mt-8 pt-6 border-t border-[#E8E4F0]">
                  <label className="text-[14px] font-bold text-[#1A1A2E] mb-1 block">Services Offered</label>
                  <p className="text-[13px] text-[#1A1A2E]/50 mb-4">Select what you'd like to provide to students</p>
                  
                  <div className="flex flex-col gap-2">
                    {servicesList.map(service => {
                      const isSelected = selectedServices.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          onClick={() => toggleService(service.id)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                            isSelected 
                              ? "border-[#1A1A2E] bg-[#FAF8F4]" 
                              : "border-[#E8E4F0] bg-white hover:bg-[#FAF8F4]/50"
                          }`}
                        >
                          <span className={`text-[14px] font-medium ${isSelected ? "text-[#1A1A2E]" : "text-[#1A1A2E]/70"}`}>
                            {service.label}
                          </span>
                          <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-colors ${
                            isSelected 
                              ? "bg-[#1A1A2E] border-[#1A1A2E]" 
                              : "bg-white border-[#E8E4F0]"
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button className="w-full bg-[#1A1A2E] text-white rounded-2xl py-4 font-semibold text-[15px] shadow-[0_4px_14px_rgba(26,26,46,0.15)] flex items-center justify-center gap-2 mt-8 active:scale-[0.98] transition-transform">
                Continue <ArrowRight className="w-4 h-4" />
              </button>

              <div className="mt-8 text-center pb-4">
                <p className="text-[14px] text-[#1A1A2E]/60">
                  Already have an account?{' '}
                  <button onClick={() => setMode("login")} className="text-[#5B4FE8] font-semibold hover:underline">
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* CSS to hide scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
