import { Building2, Smile } from "lucide-react";

interface RoleSelectionProps {
  onSelectRole: (role: "center" | "child") => void;
}

export const RoleSelection = ({ onSelectRole }: RoleSelectionProps) => {
  return (
    <div className="min-h-screen bg-[#E8F4FC] flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center">
        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-800 mb-1 italic">
          Добро пожаловать!
        </h1>
        <p className="text-gray-400 text-sm mb-10">Выберите способ входа</p>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-8">
          {/* Specialist Card */}
          <button
            onClick={() => onSelectRole("center")}
            className="bg-white rounded-3xl p-10 shadow-sm hover:shadow-md transition-shadow text-center group"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-medium text-gray-800 mb-6">
              Специалист
            </h2>
            <div className="inline-block px-7 py-3 rounded-full border border-gray-200 text-base text-gray-400 group-hover:border-amber-300 group-hover:text-amber-600 transition-colors">
              Вход по коду центра
            </div>
          </button>

          {/* Child Card */}
          <button
            onClick={() => onSelectRole("child")}
            className="bg-white rounded-3xl p-10 shadow-sm hover:shadow-md transition-shadow text-center group"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-sky-100 flex items-center justify-center">
              <Smile className="w-10 h-10 text-sky-500" />
            </div>
            <h2 className="text-2xl font-medium text-gray-800 mb-6">
              Ребёнок
            </h2>
            <div className="inline-block px-7 py-3 rounded-full border border-sky-200 bg-sky-50 text-base text-sky-500 group-hover:bg-sky-100 transition-colors">
              У меня есть код специалиста
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
