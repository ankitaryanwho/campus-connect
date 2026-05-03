import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Zap, User, MapPin, ChevronDown, CheckCircle2, Phone, CheckSquare, Square, Layers, Book, Briefcase, ArrowRight } from 'lucide-react';

export function WarmBlobs() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Signup specific state
  const [role, setRole] = useState<"student" | "provider">("student");
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [email, setEmail] = useState("");

  const programs = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const genders = [
    { id: "male", label: "Male", icon: "m" },
    { id: "female", label: "Female", icon: "f" },
    { id: "other", label: "Other", icon: "o" }
  ];
  const services = [
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("Invalid email or password. Please try again.");
  };

  const isValidCollegeEmail = email.endsWith('.edu');

  return (
    <div className="max-w-[390px] mx-auto h-[844px] overflow-hidden relative font-['Inter'] bg-[#FAF8F4] text-[#1A1A2E] shadow-2xl">
      {/* Background decorative blobs */}
      <div className="absolute w-48 h-48 bg-[#5B4FE8]/10 rounded-[60%_40%_40%_60%/60%_60%_40%_40%] -top-12 -left-12 z-0 pointer-events-none"></div>
      <div className="absolute w-16 h-16 bg-[#5B4FE8]/15 rounded-full top-8 right-4 z-0 pointer-events-none"></div>
      <div className="absolute w-36 h-36 bg-[#5B4FE8]/8 rounded-[40%_60%_60%_40%/40%_40%_60%_60%] -bottom-8 -right-8 z-0 pointer-events-none"></div>
      
      {/* Mid-left dots */}
      <div className="absolute w-3 h-3 rounded-full bg-[#5B4FE8]/20 top-48 left-6 z-0 pointer-events-none"></div>
      <div className="absolute w-3 h-3 rounded-full bg-[#5B4FE8]/20 top-52 left-10 z-0 pointer-events-none"></div>
      <div className="absolute w-3 h-3 rounded-full bg-[#5B4FE8]/20 top-46 left-12 z-0 pointer-events-none"></div>
      
      {/* Center ring */}
      <div className="absolute w-20 h-20 rounded-full border-4 border-[#5B4FE8]/15 top-20 right-16 z-0 pointer-events-none"></div>

      <div className="h-full overflow-y-auto relative z-10 no-scrollbar pb-8">
        {/* Main Card */}
        <div className="bg-white rounded-[24px] shadow-xl shadow-[#5B4FE8]/10 mx-4 mt-[72px] px-7 py-8 relative">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-[#5B4FE8] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#5B4FE8]/20">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <div className="flex items-baseline gap-1">
              <h1 className="text-[20px] font-bold text-[#1A1A2E]">Colyx</h1>
              <span className="text-[10px] font-semibold text-gray-400">v2.0</span>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex items-center mt-6 bg-[#FAF8F4] rounded-full p-1 border border-[#E8E4F0]">
              <button
                onClick={() => { setMode("login"); setError(null); }}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${mode === 'login' ? 'bg-[#5B4FE8] text-white shadow-sm' : 'text-[#1A1A2E]/50 hover:text-[#1A1A2E]'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode("signup"); setError(null); }}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${mode === 'signup' ? 'bg-[#5B4FE8] text-white shadow-sm' : 'text-[#1A1A2E]/50 hover:text-[#1A1A2E]'}`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {error && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-700 font-medium">{error}</p>
                </div>
              )}

              <div className="bg-[#FAF8F4] rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-transparent focus-within:border-[#5B4FE8]/30 focus-within:bg-white transition-all">
                <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <Mail className="w-4.5 h-4.5 text-[#5B4FE8]" />
                </div>
                <input 
                  type="email" 
                  placeholder="your@college.edu" 
                  className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-[#1A1A2E]/40 font-medium text-[#1A1A2E]"
                />
              </div>

              <div className="bg-[#FAF8F4] rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-transparent focus-within:border-[#5B4FE8]/30 focus-within:bg-white transition-all">
                <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <Lock className="w-4.5 h-4.5 text-[#5B4FE8]" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-[#1A1A2E]/40 font-medium text-[#1A1A2E]"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#1A1A2E]/40 hover:text-[#5B4FE8] p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button type="button" className="text-sm font-semibold text-[#5B4FE8] hover:underline">Forgot password?</button>
              </div>

              <button 
                type="submit" 
                className="w-full bg-[#5B4FE8] text-white rounded-2xl py-4 font-semibold text-[15px] shadow-md shadow-[#5B4FE8]/30 hover:shadow-lg hover:shadow-[#5B4FE8]/40 transition-all mt-2"
              >
                Sign In
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-[1px] bg-[#E8E4F0]"></div>
                <span className="text-xs font-medium text-[#1A1A2E]/40 uppercase tracking-wider">Or</span>
                <div className="flex-1 h-[1px] bg-[#E8E4F0]"></div>
              </div>

              <button 
                type="button" 
                className="w-full bg-[#FAF8F4] hover:bg-[#F0EDF9] text-[#5B4FE8] rounded-2xl py-3.5 font-semibold text-[15px] flex items-center justify-center gap-2 transition-all border border-[#E8E4F0]"
              >
                <Zap className="w-4.5 h-4.5" />
                Use demo account
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Role Selection */}
              <div>
                <label className="text-[13px] font-bold text-[#1A1A2E] mb-3 block uppercase tracking-wider">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRole("student")}
                    className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                      role === "student" 
                        ? "border-[#5B4FE8] bg-[#5B4FE8]/5 shadow-sm" 
                        : "border-[#E8E4F0] bg-[#FAF8F4] hover:border-[#5B4FE8]/30"
                    }`}
                  >
                    <div className="text-3xl mb-2">📚</div>
                    <span className={`font-bold text-[14px] ${role === "student" ? "text-[#5B4FE8]" : "text-[#1A1A2E]"}`}>Student</span>
                    <span className="text-[11px] text-[#1A1A2E]/50 font-medium mt-0.5">Looking for help</span>
                  </button>
                  <button
                    onClick={() => setRole("provider")}
                    className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                      role === "provider" 
                        ? "border-[#5B4FE8] bg-[#5B4FE8]/5 shadow-sm" 
                        : "border-[#E8E4F0] bg-[#FAF8F4] hover:border-[#5B4FE8]/30"
                    }`}
                  >
                    <div className="text-3xl mb-2">💼</div>
                    <span className={`font-bold text-[14px] ${role === "provider" ? "text-[#5B4FE8]" : "text-[#1A1A2E]"}`}>Provider</span>
                    <span className="text-[11px] text-[#1A1A2E]/50 font-medium mt-0.5">Offering services</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-[#FAF8F4] rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-transparent focus-within:border-[#5B4FE8]/30 focus-within:bg-white transition-all">
                  <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                    <User className="w-4.5 h-4.5 text-[#5B4FE8]" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-[#1A1A2E]/40 font-medium text-[#1A1A2E]"
                  />
                </div>

                <div className="bg-[#FAF8F4] rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-transparent hover:border-[#5B4FE8]/30 cursor-pointer transition-all">
                  <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                    <MapPin className="w-4.5 h-4.5 text-[#5B4FE8]" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[15px] text-[#1A1A2E]/60 font-medium">Select your college</span>
                  </div>
                  <ChevronDown className="w-5 h-5 text-[#1A1A2E]/40" />
                </div>

                <div className="bg-[#FAF8F4] rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-transparent focus-within:border-[#5B4FE8]/30 focus-within:bg-white transition-all">
                  <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                    <Mail className="w-4.5 h-4.5 text-[#5B4FE8]" />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="College Email" 
                    className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-[#1A1A2E]/40 font-medium text-[#1A1A2E]"
                  />
                  {email.length > 0 && (
                    isValidCollegeEmail 
                      ? <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                      : <div className="w-5 h-5 rounded-full border-2 border-orange-400 text-orange-400 flex items-center justify-center text-xs font-bold">!</div>
                  )}
                </div>

                <div className="bg-[#FAF8F4] rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-transparent focus-within:border-[#5B4FE8]/30 focus-within:bg-white transition-all">
                  <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                    <Lock className="w-4.5 h-4.5 text-[#5B4FE8]" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-[#1A1A2E]/40 font-medium text-[#1A1A2E]"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#1A1A2E]/40 hover:text-[#5B4FE8] p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                <div className="bg-[#FAF8F4] rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-transparent focus-within:border-[#5B4FE8]/30 focus-within:bg-white transition-all">
                  <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                    <Phone className="w-4.5 h-4.5 text-[#5B4FE8]" />
                  </div>
                  <input 
                    type="tel" 
                    placeholder="Phone Number (Optional)" 
                    className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-[#1A1A2E]/40 font-medium text-[#1A1A2E]"
                  />
                </div>
              </div>

              {/* Details Sections */}
              <div>
                <label className="text-[13px] font-bold text-[#1A1A2E] mb-3 block uppercase tracking-wider">Program</label>
                <div className="flex flex-wrap gap-2">
                  {programs.map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedProgram(p)}
                      className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                        selectedProgram === p 
                          ? "bg-[#5B4FE8] text-white shadow-sm" 
                          : "bg-[#FAF8F4] text-[#1A1A2E]/60 hover:bg-[#E8E4F0]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[13px] font-bold text-[#1A1A2E] mb-3 block uppercase tracking-wider">Academic Year</label>
                <div className="flex flex-wrap gap-2">
                  {years.map(y => (
                    <button
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                        selectedYear === y 
                          ? "bg-[#5B4FE8] text-white shadow-sm" 
                          : "bg-[#FAF8F4] text-[#1A1A2E]/60 hover:bg-[#E8E4F0]"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[13px] font-bold text-[#1A1A2E] mb-3 block uppercase tracking-wider text-[#1A1A2E]/50">Gender (Optional)</label>
                <div className="flex flex-wrap gap-2">
                  {genders.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGender(g.id)}
                      className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5 ${
                        selectedGender === g.id 
                          ? "bg-[#5B4FE8] text-white shadow-sm" 
                          : "bg-[#FAF8F4] text-[#1A1A2E]/60 hover:bg-[#E8E4F0]"
                      }`}
                    >
                      <span className="opacity-70">{g.id === 'male' ? '👨' : g.id === 'female' ? '👩' : '🧑'}</span>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {role === "provider" && (
                <div className="mt-2 p-5 bg-[#5B4FE8]/5 border border-[#5B4FE8]/20 rounded-2xl">
                  <label className="text-[13px] font-bold text-[#5B4FE8] mb-3 block uppercase tracking-wider">Services you offer</label>
                  <div className="flex flex-col gap-2">
                    {services.map(s => {
                      const isSelected = selectedServices.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleService(s.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                            isSelected ? "bg-white shadow-sm border border-[#5B4FE8]/30" : "bg-[#FAF8F4] hover:bg-white border border-transparent"
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-[#5B4FE8]" />
                          ) : (
                            <Square className="w-5 h-5 text-[#1A1A2E]/30" />
                          )}
                          <span className={`text-[14px] font-medium ${isSelected ? "text-[#1A1A2E]" : "text-[#1A1A2E]/70"}`}>
                            {s.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button 
                type="button" 
                className="w-full bg-[#5B4FE8] text-white rounded-2xl py-4 font-semibold text-[15px] shadow-md shadow-[#5B4FE8]/30 hover:shadow-lg hover:shadow-[#5B4FE8]/40 transition-all mt-4 flex items-center justify-center gap-2 group"
              >
                Continue
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Link (Outside Card) */}
        <div className="text-center mt-6">
          {mode === "login" ? (
            <p className="text-sm font-medium text-[#1A1A2E]/60">
              New here?{" "}
              <button onClick={() => setMode("signup")} className="font-bold text-[#5B4FE8] hover:underline">
                Sign Up →
              </button>
            </p>
          ) : (
            <p className="text-sm font-medium text-[#1A1A2E]/60">
              Already have an account?{" "}
              <button onClick={() => setMode("login")} className="font-bold text-[#5B4FE8] hover:underline">
                Sign In →
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
