import { Building2, Smile } from "lucide-react";
import classroomBackground from "@/assets/classroom-background.png";

interface RoleSelectionProps {
  onSelectRole: (role: "center" | "child") => void;
}

export const RoleSelection = ({ onSelectRole }: RoleSelectionProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 safe-area-inset relative overflow-hidden">
      {/* Background image layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${classroomBackground})` }}
      />
      
      {/* White blurred overlay */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />
      
      <div className="relative z-10 w-full max-w-4xl text-center px-4 sm:px-0">
        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">
          Добро пожаловать!
        </h1>
        <p className="text-gray-500 text-sm mb-6 sm:mb-10">Выберите способ входа</p>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
          {/* Specialist Card */}
          <button
            onClick={() => onSelectRole("center")}
            className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_25px_rgba(0,0,0,0.12)] transition-all duration-300 text-center group flex flex-col items-center justify-center w-full p-6 sm:p-8 sm:aspect-[4/3]"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-[#F5DEB3] flex items-center justify-center">
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-[#D4A853]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4 sm:mb-6">
              Специалист
            </h2>
            <div className="inline-block px-5 sm:px-7 py-2.5 sm:py-3 rounded-full border border-amber-200 bg-amber-50 text-sm sm:text-base text-amber-600 group-hover:bg-amber-100 group-hover:border-amber-300 transition-colors">
              Вход по коду центра
            </div>
          </button>

          {/* Child Card */}
          <button
            onClick={() => onSelectRole("child")}
            className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_25px_rgba(0,0,0,0.12)] transition-all duration-300 text-center group flex flex-col items-center justify-center w-full p-6 sm:p-8 sm:aspect-[4/3]"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-[#B5DEF5] flex items-center justify-center">
              <Smile className="w-8 h-8 sm:w-10 sm:h-10 text-[#5BA8D4]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4 sm:mb-6">
              Ребёнок
            </h2>
            <div className="inline-block px-5 sm:px-7 py-2.5 sm:py-3 rounded-full border border-sky-300 bg-sky-50 text-sm sm:text-base text-sky-600 group-hover:bg-sky-100 group-hover:border-sky-400 transition-colors">
              У меня есть код специалиста
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
