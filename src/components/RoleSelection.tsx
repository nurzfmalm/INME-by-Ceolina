import { Building2, Smile } from "lucide-react";

interface RoleSelectionProps {
  onSelectRole: (role: "center" | "child") => void;
}

export const RoleSelection = ({ onSelectRole }: RoleSelectionProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center">
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Добро пожаловать!
        </h1>
        <p className="text-gray-600 text-base mb-10">Выберите способ входа</p>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-8">
          {/* Specialist Card */}
          <button
            onClick={() => onSelectRole("center")}
            className="bg-white rounded-3xl p-10 shadow-lg hover:shadow-xl transition-all duration-300 text-center group hover:-translate-y-1"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center shadow-md">
              <Building2 className="w-12 h-12 text-amber-700" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Специалист
            </h2>
            <div className="inline-block px-7 py-3 rounded-full border-2 border-amber-300 bg-amber-50 text-base font-medium text-amber-700 group-hover:bg-amber-100 group-hover:border-amber-400 transition-colors">
              Вход по коду центра
            </div>
          </button>

          {/* Child Card */}
          <button
            onClick={() => onSelectRole("child")}
            className="bg-white rounded-3xl p-10 shadow-lg hover:shadow-xl transition-all duration-300 text-center group hover:-translate-y-1"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-sky-200 to-blue-400 flex items-center justify-center shadow-md">
              <Smile className="w-12 h-12 text-blue-700" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Ребёнок
            </h2>
            <div className="inline-block px-7 py-3 rounded-full border-2 border-sky-400 bg-sky-100 text-base font-medium text-sky-700 group-hover:bg-sky-200 group-hover:border-sky-500 transition-colors">
              У меня есть код специалиста
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
