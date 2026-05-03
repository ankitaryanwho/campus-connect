import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Zap, 
  BookOpen, 
  Briefcase, 
  User, 
  MapPin, 
  ChevronDown, 
  Check, 
  X, 
  Phone,
  ArrowRight
} from 'lucide-react';

export function PurpleWave() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"student" | "provider">("student");
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hasError, setHasError] = useState(false);

  const programs = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const genders = [
    { id: "male", label: "Male", icon: "m" },
    { id: "female", label: "Female", icon: "f" },
    { id: "other", label: "Other", icon: "o" }
  ];
  
  const servicesList = [
    { id: "assignments", label: "Assignments", icon: "📝" },
    { id: "certifications", label: "Certifications", icon: "🏆" },
    { id: "deliveries", label: "Deliveries", icon: "🚚" },
    { id: "tasks", label: "Tasks & Gigs", icon: "⚡" },
  ];

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter(s => s !== id));
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const handleDemoLogin = () => {
    setHasError(true);
    setTimeout(() => setHasError(false), 3000);
  };

  return (
    <div className="max-w-[390px] mx-auto h-[844px] overflow-hidden relative font-['Inter'] bg-[#FAF8F4] flex flex-col shadow-2xl">
      {/* Scrollable Container */}
      <div className="h-full overflow-y-auto flex flex-col pb-8 no-scrollbar">
        
        {/* Purple Hero Section */}
        <div className="bg-gradient-to-br from-[#5B4FE8] to-[#8B6FFF] px-6 pt-14 pb-0 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
            <span className="text-white font-black text-[20px]">CC</span>
          </div>
          <h1 className="text-white font-bold text-[26px] mb-1">Colyx</h1>
          <p className="text-white/80 text-[13px] tracking-widest uppercase mb-6 font-medium">Connect · Learn · Earn</p>
        </div>

        {/* SVG Wave */}
        <div className="bg-gradient-to-br from-[#5B4FE8] to-[#8B6FFF] shrink-0">
          <svg viewBox="0 0 390 50" preserveAspectRatio="none" width="100%" height="50" className="block">
            <path d="M0,50 L0,20 C80,50 200,0 390,30 L390,50 Z" fill="white" />
          </svg>
        </div>

        {/* White Form Section */}
        <div className="bg-white flex-1 px-6 -mt-1 rounded-b-3xl">
          
          {/* Mode Tabs */}
          <div className="flex justify-center items-center gap-8 mb-8 pt-4">
            <button 
              onClick={() => setMode("login")}
              className={`text-lg transition-colors pb-2 ${mode === "login" ? "text-[#5B4FE8] font-semibold border-b-2 border-[#5B4FE8]" : "text-[#1A1A2E]/50 font-medium"}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setMode("signup")}
              className={`text-lg transition-colors pb-2 ${mode === "signup" ? "text-[#5B4FE8] font-semibold border-b-2 border-[#5B4FE8]" : "text-[#1A1A2E]/50 font-medium"}`}
            >
              Sign Up
            </button>
          </div>

          {/* LOGIN FORM */}
          {mode === "login" && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Error Box */}
              {hasError && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                  <p className="text-[#EF4444] text-sm">Invalid credentials. Please try again or use the demo account.</p>
                </div>
              )}

              {/* Email Input */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4F0] p-1.5 flex items-center gap-3 focus-within:border-[#5B4FE8] focus-within:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#5B4FE8]" />
                </div>
                <input 
                  type="email" 
                  placeholder="your@college.edu" 
                  className="flex-1 bg-transparent border-none outline-none text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 text-sm font-medium"
                />
              </div>

              {/* Password Input */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4F0] p-1.5 flex items-center gap-3 focus-within:border-[#5B4FE8] focus-within:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-[#5B4FE8]" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="flex-1 bg-transparent border-none outline-none text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 text-sm font-medium"
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-[#1A1A2E]/40 hover:text-[#5B4FE8] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex justify-end mt-1 mb-2">
                <button className="text-[13px] text-[#5B4FE8] font-semibold hover:underline">Forgot password?</button>
              </div>

              {/* Sign In Button */}
              <button className="w-full bg-gradient-to-r from-[#5B4FE8] to-[#7C6FFF] rounded-2xl py-4 text-white font-bold text-[15px] shadow-lg shadow-[#5B4FE8]/30 active:scale-[0.98] transition-all">
                Sign In
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="h-[1px] bg-[#E8E4F0] flex-1"></div>
                <span className="text-[13px] text-[#1A1A2E]/40 font-medium px-2">or continue with</span>
                <div className="h-[1px] bg-[#E8E4F0] flex-1"></div>
              </div>

              {/* Demo Button */}
              <button 
                onClick={handleDemoLogin}
                className="w-full border border-[#E8E4F0] bg-white rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:bg-[#FAF8F4] active:scale-[0.98] transition-all"
              >
                <Zap className="w-5 h-5 text-[#5B4FE8] fill-[#5B4FE8]/20" />
                <span className="text-[#5B4FE8] font-semibold text-[14px]">Use demo account</span>
              </button>

              {/* Footer */}
              <div className="mt-8 text-center">
                <p className="text-[#1A1A2E]/60 text-[14px]">
                  Don't have an account?{' '}
                  <button onClick={() => setMode("signup")} className="text-[#5B4FE8] font-bold hover:underline">
                    Sign Up
                  </button>
                </p>
              </div>

            </div>
          )}

          {/* SIGNUP FORM */}
          {mode === "signup" && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
              
              {/* Role Selector */}
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button 
                  onClick={() => setRole("student")}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    role === "student" 
                    ? "border-[#5B4FE8] bg-[#EDE9FE]/40 shadow-md shadow-[#5B4FE8]/10" 
                    : "border-[#E8E4F0] bg-white hover:border-[#E8E4F0]/80"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${role === "student" ? "bg-[#5B4FE8] text-white" : "bg-[#F3F4F6] text-[#1A1A2E]/50"}`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className={`text-[13px] font-bold ${role === "student" ? "text-[#5B4FE8]" : "text-[#1A1A2E]/60"}`}>Student</span>
                </button>
                
                <button 
                  onClick={() => setRole("provider")}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    role === "provider" 
                    ? "border-[#5B4FE8] bg-[#EDE9FE]/40 shadow-md shadow-[#5B4FE8]/10" 
                    : "border-[#E8E4F0] bg-white hover:border-[#E8E4F0]/80"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${role === "provider" ? "bg-[#5B4FE8] text-white" : "bg-[#F3F4F6] text-[#1A1A2E]/50"}`}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className={`text-[13px] font-bold ${role === "provider" ? "text-[#5B4FE8]" : "text-[#1A1A2E]/60"}`}>Service Provider</span>
                </button>
              </div>

              {/* Full Name */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4F0] p-1.5 flex items-center gap-3 focus-within:border-[#5B4FE8] focus-within:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-[#5B4FE8]" />
                </div>
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  className="flex-1 bg-transparent border-none outline-none text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 text-sm font-medium"
                />
              </div>

              {/* College Selection */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4F0] p-1.5 flex items-center gap-3 focus-within:border-[#5B4FE8] focus-within:shadow-md transition-all cursor-pointer hover:bg-gray-50">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-[#5B4FE8]" />
                </div>
                <div className="flex-1 text-[#1A1A2E]/40 text-sm font-medium">Select your college</div>
                <ChevronDown className="w-5 h-5 text-[#1A1A2E]/40 mr-2" />
              </div>

              {/* College Email */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4F0] p-1.5 flex items-center gap-3 focus-within:border-[#5B4FE8] focus-within:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#5B4FE8]" />
                </div>
                <input 
                  type="email" 
                  placeholder="College Email" 
                  defaultValue="student@university"
                  className="flex-1 bg-transparent border-none outline-none text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 text-sm font-medium"
                />
                <div className="p-1 rounded-full bg-[#10B981]/10 mr-2">
                  <Check className="w-4 h-4 text-[#10B981]" />
                </div>
              </div>

              {/* Password Input */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4F0] p-1.5 flex items-center gap-3 focus-within:border-[#5B4FE8] focus-within:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-[#5B4FE8]" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Create Password" 
                  className="flex-1 bg-transparent border-none outline-none text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 text-sm font-medium"
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-[#1A1A2E]/40 hover:text-[#5B4FE8] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Phone (Optional) */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4F0] p-1.5 flex items-center gap-3 focus-within:border-[#5B4FE8] focus-within:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-[#5B4FE8]" />
                </div>
                <input 
                  type="tel" 
                  placeholder="Phone Number (Optional)" 
                  className="flex-1 bg-transparent border-none outline-none text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 text-sm font-medium"
                />
              </div>

              {/* Program Selection */}
              <div>
                <label className="text-[13px] font-bold text-[#1A1A2E] mb-3 block ml-1">Program</label>
                <div className="flex flex-wrap gap-2">
                  {programs.map(prog => (
                    <button
                      key={prog}
                      onClick={() => setSelectedProgram(prog)}
                      className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                        selectedProgram === prog 
                        ? "bg-[#5B4FE8] text-white shadow-md shadow-[#5B4FE8]/20" 
                        : "bg-[#F3F4F6] text-[#1A1A2E]/60 hover:bg-[#E8E4F0]"
                      }`}
                    >
                      {prog}
                    </button>
                  ))}
                </div>
              </div>

              {/* Academic Year */}
              <div>
                <label className="text-[13px] font-bold text-[#1A1A2E] mb-3 block ml-1">Academic Year</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {years.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${
                        selectedYear === year 
                        ? "bg-[#5B4FE8] text-white shadow-md shadow-[#5B4FE8]/20" 
                        : "bg-[#F3F4F6] text-[#1A1A2E]/60 hover:bg-[#E8E4F0]"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="text-[13px] font-bold text-[#1A1A2E] mb-3 block ml-1">Gender (Optional)</label>
                <div className="flex gap-2">
                  {genders.map(gender => (
                    <button
                      key={gender.id}
                      onClick={() => setSelectedGender(gender.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                        selectedGender === gender.id 
                        ? "bg-[#5B4FE8] text-white shadow-md shadow-[#5B4FE8]/20" 
                        : "bg-[#F3F4F6] text-[#1A1A2E]/60 hover:bg-[#E8E4F0]"
                      }`}
                    >
                      <span className="uppercase opacity-70 text-[10px]">{gender.icon}</span>
                      {gender.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Services Section */}
              {role === "provider" && (
                <div className="mt-2 p-5 bg-[#FAF8F4] rounded-2xl border border-[#E8E4F0]/50 animate-in fade-in slide-in-from-top-2">
                  <div className="mb-4">
                    <h3 className="font-bold text-[#1A1A2E] text-[15px]">Services you offer</h3>
                    <p className="text-[12px] text-[#1A1A2E]/50 mt-1">Select the services you want to provide to other students.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {servicesList.map(service => {
                      const isSelected = selectedServices.includes(service.id);
                      return (
                        <div 
                          key={service.id}
                          onClick={() => toggleService(service.id)}
                          className={`relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                            isSelected 
                            ? "bg-white border-[#5B4FE8] shadow-sm shadow-[#5B4FE8]/10" 
                            : "bg-white/50 border-[#E8E4F0] hover:border-[#5B4FE8]/30 hover:bg-white"
                          }`}
                        >
                          <div className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            isSelected ? "bg-[#5B4FE8]" : "bg-[#F3F4F6] border border-[#E8E4F0]"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-xl">{service.icon}</span>
                          <span className={`text-[12px] font-bold ${isSelected ? "text-[#1A1A2E]" : "text-[#1A1A2E]/70"}`}>
                            {service.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Continue Button */}
              <button className="w-full mt-4 bg-gradient-to-r from-[#5B4FE8] to-[#7C6FFF] rounded-2xl py-4 text-white font-bold text-[15px] shadow-lg shadow-[#5B4FE8]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
                Continue
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Footer */}
              <div className="mt-4 text-center">
                <p className="text-[#1A1A2E]/60 text-[14px]">
                  Already have an account?{' '}
                  <button onClick={() => setMode("login")} className="text-[#5B4FE8] font-bold hover:underline">
                    Sign In
                  </button>
                </p>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
