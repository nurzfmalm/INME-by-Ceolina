import { Building2, Smile } from "lucide-react";

interface RoleSelectionProps {
  onSelectRole: (role: "center" | "child") => void;
}

export const RoleSelection = ({ onSelectRole }: RoleSelectionProps) => {
  return (
    <div className="min-h-screen bg-[#E8F4FC] flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center">
        {/* Title */}
        <h1 className="text-3xl font-semibold text-gray-800 mb-2 italic">
          Добро пожаловать!
        </h1>
        <p className="text-gray-500 mb-10">Выберите способ входа</p>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Specialist Card */}
          <button
            onClick={() => onSelectRole("center")}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow text-center group"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Специалист
            </h2>
            <div className="inline-block px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-500 group-hover:border-amber-300 group-hover:text-amber-600 transition-colors">
              Вход по коду центра
            </div>
          </button>

          {/* Child Card */}
          <button
            onClick={() => onSelectRole("child")}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow text-center group"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-sky-100 flex items-center justify-center">
              <Smile className="w-7 h-7 text-sky-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Ребёнок
            </h2>
            <div className="inline-block px-4 py-2 rounded-full border border-sky-200 bg-sky-50 text-sm text-sky-600 group-hover:bg-sky-100 transition-colors">
              У меня есть код специалиста
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
