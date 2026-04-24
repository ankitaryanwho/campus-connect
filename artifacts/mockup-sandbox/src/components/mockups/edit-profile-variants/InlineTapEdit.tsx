import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Camera, 
  User, 
  AlignLeft, 
  GraduationCap, 
  BookOpen, 
  Phone, 
  ChevronRight 
} from 'lucide-react';

type FieldId = 'name' | 'bio' | 'college' | 'program' | 'phone';

interface ProfileData {
  name: string;
  bio: string;
  college: string;
  program: string;
  phone: string;
}

export function InlineTapEdit() {
  const [activeField, setActiveField] = useState<FieldId | null>('bio');
  const [formData, setFormData] = useState<ProfileData>({
    name: 'Sneha Patel',
    bio: 'CS junior | design + code 🎨',
    college: 'MIT',
    program: 'Computer Science',
    phone: '+1 (617) 555-0194',
  });

  const fields: { id: FieldId; icon: React.ReactNode; label: string }[] = [
    { id: 'name', icon: <User size={20} />, label: 'Name' },
    { id: 'bio', icon: <AlignLeft size={20} />, label: 'Bio' },
    { id: 'college', icon: <GraduationCap size={20} />, label: 'College' },
    { id: 'program', icon: <BookOpen size={20} />, label: 'Program' },
    { id: 'phone', icon: <Phone size={20} />, label: 'Phone' },
  ];

  const handleFieldChange = (id: FieldId, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = () => {
    setActiveField(null);
  };

  return (
    <div className="max-w-[390px] mx-auto min-h-[844px] h-screen bg-[#FAF8F4] relative overflow-hidden font-['Inter'] text-[#1A1A2E] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 shrink-0 bg-[#FAF8F4] z-10 sticky top-0">
        <button className="p-2 -ml-2 text-[#1A1A2E] active:opacity-70 transition-opacity">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">Edit Profile</h1>
        <button 
          className="text-[#5B4FE8] font-medium text-base active:opacity-70 transition-opacity"
          onClick={() => setActiveField(null)}
        >
          Done
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mt-6 mb-8 px-4">
          <div className="relative mb-4">
            <div 
              className="w-[120px] h-[120px] rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-sm ring-4 ring-[#5B4FE8]/10"
              style={{ background: 'linear-gradient(135deg, #5B4FE8, #9B8FFF)' }}
            >
              SP
            </div>
            <button className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-[#5B4FE8] shadow-sm active:scale-95 transition-transform">
              <Camera size={20} className="text-[#5B4FE8]" />
            </button>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">{formData.name}</h2>
          <p className="text-[#1A1A2E]/60 font-medium">{formData.college}</p>
        </div>

        {/* Fields List */}
        <div className="px-4 flex flex-col gap-2">
          {fields.map((field) => {
            const isActive = activeField === field.id;
            
            return (
              <div 
                key={field.id}
                className={`bg-white rounded-2xl overflow-hidden transition-all duration-300 ease-in-out border ${
                  isActive ? 'border-[#5B4FE8]/20 shadow-sm' : 'border-transparent'
                }`}
              >
                <button
                  className="w-full flex items-center px-4 py-4 text-left active:bg-black/[0.02] transition-colors"
                  onClick={() => setActiveField(isActive ? null : field.id)}
                >
                  <div className="text-[#1A1A2E]/40 mr-3">
                    {field.icon}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <span className="font-medium text-[15px]">{field.label}</span>
                    {!isActive && (
                      <span className="text-[#1A1A2E]/50 text-[15px] truncate max-w-[140px] text-right ml-4">
                        {formData[field.id]}
                      </span>
                    )}
                  </div>
                  <ChevronRight 
                    size={20} 
                    className={`ml-2 text-[#1A1A2E]/30 transition-transform duration-300 ${
                      isActive ? 'rotate-90' : ''
                    }`} 
                  />
                </button>

                {/* Expanded Input Area */}
                <div 
                  className={`grid transition-all duration-300 ease-in-out ${
                    isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1">
                      {field.id === 'bio' ? (
                        <textarea
                          value={formData[field.id]}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="w-full bg-transparent border-0 border-b-2 border-[#5B4FE8] pb-2 text-[#1A1A2E] text-[15px] focus:outline-none focus:ring-0 resize-none min-h-[60px]"
                          placeholder={`Enter your ${field.label.toLowerCase()}`}
                          autoFocus={isActive}
                        />
                      ) : (
                        <input
                          type={field.id === 'phone' ? 'tel' : 'text'}
                          value={formData[field.id]}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="w-full bg-transparent border-0 border-b-2 border-[#5B4FE8] pb-2 text-[#1A1A2E] text-[15px] focus:outline-none focus:ring-0"
                          placeholder={`Enter your ${field.label.toLowerCase()}`}
                          autoFocus={isActive}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Save Button */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-6 pointer-events-none transition-transform duration-300 ease-out ${
          activeField ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button 
          onClick={handleSave}
          className="w-full h-12 bg-[#5B4FE8] text-white rounded-full font-semibold text-[15px] shadow-lg pointer-events-auto active:scale-[0.98] transition-transform flex items-center justify-center"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
