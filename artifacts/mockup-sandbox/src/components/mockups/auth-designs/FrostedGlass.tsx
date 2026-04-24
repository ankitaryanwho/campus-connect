import React, { useState } from 'react';
import { 
  Mail, Lock, Eye, EyeOff, AlertCircle, Zap, BookOpen, Briefcase, 
  User, MapPin, ChevronDown, Check, X, ArrowRight, Phone, Layers 
} from 'lucide-react';

export function FrostedGlass() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"student" | "provider">("student");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hasError, setHasError] = useState(false);

  const programs = ['BCA', 'BTech', 'MBA', 'MTech', 'BSc', 'BCom', 'BA', 'Other'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const genders = [
    { label: 'Male', icon: 'm' },
    { label: 'Female', icon: 'f' },
    { label: 'Other', icon: 'o' }
  ];
  const services = [
    { id: 'assignments', label: '📝 Assignments' },
    { id: 'certifications', label: '🏆 Certifications' },
    { id: 'deliveries', label: '🚚 Deliveries' },
    { id: 'tasks', label: '⚡ Tasks & Gigs' }
  ];

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleDemoClick = () => {
    setHasError(true);
    setTimeout(() => setHasError(false), 3000);
  };

  return (
    <div className="max-w-[390px] mx-auto h-[844px] overflow-hidden relative font-['Inter'] bg-[#2D1B69]">
      {/* Decorative Blobs */}
      <div className="absolute w-64 h-64 rounded-full bg-[#5B4FE8] opacity-40 blur-3xl -top-20 -right-20 z-0 pointer-events-none" />
      <div className="absolute w-48 h-48 rounded-full bg-[#9B87F5] opacity-30 blur-2xl -bottom-10 -left-10 z-0 pointer-events-none" />
      <div className="absolute w-32 h-32 rounded-full bg-[#7C6FFF] opacity-20 blur-xl top-40 -left-16 z-0 pointer-events-none" />

      {/* Inner Scrollable */}
      <div className="h-full overflow-y-auto z-10 relative pb-10">
        <div 
          className="mx-4 my-8 rounded-[28px] p-7"
          style={{ 
            background: 'rgba(255,255,255,0.12)', 
            border: '1px solid rgba(255,255,255,0.2)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
              <Layers className="text-white w-6 h-6" />
            </div>
            <h1 className="text-white font-bold text-[20px] mb-6">CampusConnect</h1>

            {/* Mode Toggle */}
            <div className="bg-white/15 p-1 rounded-full flex w-full">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  mode === "login" ? "bg-white/30 text-white shadow-sm" : "text-white/60 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  mode === "signup" ? "bg-white/30 text-white shadow-sm" : "text-white/60 hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Form Content */}
          {mode === "login" ? (
            <div className="space-y-5">
              {/* Login Fields */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Mail className="w-5 h-5 text-white/70" />
                  </div>
                  <input
                    type="email"
                    placeholder="your@college.edu"
                    className="w-full bg-white/15 border border-white/20 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Lock className="w-5 h-5 text-white/70" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full bg-white/15 border border-white/20 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {hasError && (
                <div className="bg-red-400/20 border border-red-300/30 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-200 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200 leading-tight">
                    Invalid email or password. Please try again.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2">
                <button className="w-full bg-white text-[#5B4FE8] font-bold rounded-xl py-4 shadow-lg hover:bg-white/90 transition-colors">
                  Sign In
                </button>
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-white/20"></div>
                <span className="text-white/50 text-sm font-medium">or</span>
                <div className="flex-1 h-px bg-white/20"></div>
              </div>

              <button 
                onClick={handleDemoClick}
                className="w-full bg-white/15 border border-white/20 text-white rounded-xl py-3.5 flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
              >
                <Zap className="w-5 h-5" fill="currentColor" />
                Use demo account
              </button>

              <p className="text-center text-sm text-white/60 mt-6">
                Don't have an account?{' '}
                <button onClick={() => setMode("signup")} className="text-white font-bold hover:underline">
                  Sign Up
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Role Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRole("student")}
                  className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    role === "student" 
                      ? "bg-white/25 border-white/50 text-white" 
                      : "bg-white/10 border-white/20 text-white/70 hover:bg-white/15"
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm font-medium">Student</span>
                </button>
                <button
                  onClick={() => setRole("provider")}
                  className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    role === "provider" 
                      ? "bg-white/25 border-white/50 text-white" 
                      : "bg-white/10 border-white/20 text-white/70 hover:bg-white/15"
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                  <span className="text-sm font-medium">Service Provider</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <User className="w-5 h-5 text-white/70" />
                  </div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full bg-white/15 border border-white/20 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
                  />
                </div>

                {/* College Row */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <MapPin className="w-5 h-5 text-white/70" />
                  </div>
                  <select className="w-full bg-white/15 border border-white/20 rounded-xl py-3.5 pl-12 pr-10 text-white appearance-none focus:outline-none focus:border-white/40 [&>option]:bg-[#2D1B69] [&>option]:text-white">
                    <option value="" disabled selected hidden>Select your college</option>
                    <option value="1">Engineering College A</option>
                    <option value="2">Business School B</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="w-5 h-5 text-white/70" />
                  </div>
                </div>

                {/* College Email */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Mail className="w-5 h-5 text-white/70" />
                  </div>
                  <input
                    type="email"
                    placeholder="College Email"
                    className="w-full bg-white/15 border border-white/20 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {/* Example validation icon */}
                    <Check className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                {/* Password */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Lock className="w-5 h-5 text-white/70" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="w-full bg-white/15 border border-white/20 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Programs */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/80 px-1">Program</label>
                <div className="flex flex-wrap gap-2">
                  {programs.map(prog => (
                    <button
                      key={prog}
                      onClick={() => setSelectedProgram(prog)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedProgram === prog 
                          ? "bg-white/40 text-white font-medium" 
                          : "bg-white/15 text-white/80 hover:bg-white/25"
                      }`}
                    >
                      {prog}
                    </button>
                  ))}
                </div>
              </div>

              {/* Academic Year */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/80 px-1">Academic Year</label>
                <div className="flex flex-wrap gap-2">
                  {years.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedYear === year 
                          ? "bg-white/40 text-white font-medium" 
                          : "bg-white/15 text-white/80 hover:bg-white/25"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/80 px-1">Gender <span className="text-white/40">(Optional)</span></label>
                <div className="flex flex-wrap gap-2">
                  {genders.map(g => (
                    <button
                      key={g.label}
                      onClick={() => setSelectedGender(g.label)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                        selectedGender === g.label 
                          ? "bg-white/40 text-white font-medium" 
                          : "bg-white/15 text-white/80 hover:bg-white/25"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Phone className="w-5 h-5 text-white/70" />
                </div>
                <input
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  className="w-full bg-white/15 border border-white/20 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
                />
              </div>

              {/* Services (Provider Only) */}
              {role === "provider" && (
                <div className="space-y-3 pt-2">
                  <label className="text-sm font-medium text-white px-1">What services do you offer?</label>
                  <div className="space-y-2">
                    {services.map(service => (
                      <label 
                        key={service.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-white/10 border border-white/10 cursor-pointer hover:bg-white/15 transition-colors"
                      >
                        <span className="text-white text-sm font-medium">{service.label}</span>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          selectedServices.includes(service.id)
                            ? 'bg-white border-white text-[#5B4FE8]'
                            : 'border-white/40 text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={selectedServices.includes(service.id)}
                          onChange={() => toggleService(service.id)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4">
                <button className="w-full bg-white text-[#5B4FE8] font-bold rounded-xl py-4 shadow-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <p className="text-center text-sm text-white/60 mt-4">
                Already have an account?{' '}
                <button onClick={() => setMode("login")} className="text-white font-bold hover:underline">
                  Sign In
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
