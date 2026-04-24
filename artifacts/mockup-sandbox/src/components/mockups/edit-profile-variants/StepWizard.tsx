import React, { useState } from 'react';

export function StepWizard() {
  const [currentStep, setCurrentStep] = useState(2);
  const totalSteps = 5;

  const [formData, setFormData] = useState({
    name: 'Sneha Patel',
    bio: 'CS junior | design + code 🎨',
    college: 'MIT',
    program: 'Computer Science',
    phone: '+1 (617) 555-0194',
  });

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-[390px] mx-auto min-h-screen bg-[#F0EEFF] relative overflow-hidden font-['Inter'] flex flex-col">
      {/* Top Section */}
      <div className="pt-12 px-6 h-[30vh]">
        {/* Progress Bar */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNum = index + 1;
            const isFilled = stepNum <= currentStep;
            return (
              <div
                key={stepNum}
                className={`h-1 flex-1 ${
                  isFilled ? 'bg-[#5B4FE8]' : 'bg-[#E5E7EB]'
                } ${
                  stepNum === currentStep ? 'rounded-r-full' : ''
                } ${index === 0 ? 'rounded-l-full' : ''} ${index === totalSteps - 1 ? 'rounded-r-full' : ''}`}
              />
            );
          })}
        </div>
        <p className="text-sm text-gray-500 font-medium mb-8">
          Step {currentStep} of {totalSteps}
        </p>
      </div>

      {/* Main Content Card */}
      <div className="absolute bottom-0 w-full h-[75vh] bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex flex-col pt-10 pb-8 px-6 animate-slideUp">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {currentStep === 1 && (
            <div className="flex flex-col items-center animate-fadeIn text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-[#5B4FE8] rounded-full opacity-20 animate-ping" style={{ animationDuration: '2s' }}></div>
                <div className="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-[#5B4FE8] to-[#9D94FF] flex items-center justify-center text-4xl font-bold text-white relative z-10 shadow-lg border-4 border-white">
                  SP
                </div>
              </div>
              <h2 className="text-[28px] font-bold text-[#1A1A2E] mb-2">Profile Photo</h2>
              <p className="text-gray-500 mb-8">Tap to update your photo</p>
              <button className="px-8 py-3 rounded-full border-2 border-[#5B4FE8] text-[#5B4FE8] font-bold text-lg hover:bg-[#F0EEFF] transition-colors">
                Choose Photo
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col items-center animate-fadeIn text-center">
              <div className="text-5xl mb-6">👤</div>
              <h2 className="text-[32px] font-bold text-[#1A1A2E] mb-2 tracking-tight">What's your name?</h2>
              <p className="text-gray-500 mb-12 text-lg">This is how others will find you</p>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Full name"
                className="w-full text-center text-[28px] font-semibold text-[#1A1A2E] border-b-2 border-[#E5E7EB] focus:border-[#5B4FE8] outline-none pb-3 bg-transparent transition-colors placeholder:text-gray-300"
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col items-center animate-fadeIn text-center">
              <div className="text-5xl mb-6">✍️</div>
              <h2 className="text-[32px] font-bold text-[#1A1A2E] mb-2 tracking-tight">Tell us about yourself</h2>
              <p className="text-gray-500 mb-8 text-lg">A short intro that shows on your profile</p>
              <textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Write your bio..."
                className="w-full bg-[#F0EEFF] rounded-[24px] p-6 text-[24px] font-medium text-[#1A1A2E] border-none outline-none resize-none h-[200px] placeholder:text-gray-400"
              />
            </div>
          )}

          {currentStep === 4 && (
            <div className="flex flex-col items-center animate-fadeIn text-center">
              <div className="text-5xl mb-6">🎓</div>
              <h2 className="text-[32px] font-bold text-[#1A1A2E] mb-10 tracking-tight">Your academic info</h2>
              
              <div className="w-full flex flex-col gap-8">
                <input
                  type="text"
                  value={formData.college}
                  onChange={(e) => handleChange('college', e.target.value)}
                  placeholder="College / University"
                  className="w-full text-center text-[24px] font-semibold text-[#1A1A2E] border-b-2 border-[#E5E7EB] focus:border-[#5B4FE8] outline-none pb-3 bg-transparent transition-colors placeholder:text-gray-300"
                />
                <input
                  type="text"
                  value={formData.program}
                  onChange={(e) => handleChange('program', e.target.value)}
                  placeholder="Program / Major"
                  className="w-full text-center text-[24px] font-semibold text-[#1A1A2E] border-b-2 border-[#E5E7EB] focus:border-[#5B4FE8] outline-none pb-3 bg-transparent transition-colors placeholder:text-gray-300"
                />
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="flex flex-col items-center animate-fadeIn text-center">
              <div className="text-5xl mb-6">📱</div>
              <h2 className="text-[32px] font-bold text-[#1A1A2E] mb-2 tracking-tight">How can people reach you?</h2>
              <p className="text-gray-500 mb-12 text-lg">For secure campus connections</p>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Phone number"
                className="w-full text-center text-[28px] font-semibold text-[#1A1A2E] border-b-2 border-[#E5E7EB] focus:border-[#5B4FE8] outline-none pb-3 bg-transparent transition-colors placeholder:text-gray-300"
              />
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-100">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`text-lg font-medium py-3 px-2 ${
              currentStep === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-[#1A1A2E]'
            }`}
          >
            ← Back
          </button>
          
          <button
            onClick={handleNext}
            className="bg-[#5B4FE8] text-white font-bold text-lg py-4 rounded-full w-[160px] shadow-[0_8px_20px_rgba(91,79,232,0.3)] hover:bg-[#4A3FD1] hover:-translate-y-0.5 transition-all active:translate-y-0"
          >
            {currentStep === totalSteps ? 'Finish ✓' : 'Next →'}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
