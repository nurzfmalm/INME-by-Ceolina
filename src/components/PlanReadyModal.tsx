import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PlanReadyModalProps {
  open: boolean;
  onStart: () => void;
}

export const PlanReadyModal = ({ open, onStart }: PlanReadyModalProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-sm bg-white rounded-3xl p-8 text-center border-0 shadow-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Character illustration */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            {/* Decorative elements */}
            <div className="absolute -left-8 -top-4">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="20" cy="20" rx="18" ry="10" fill="#7CB9E8" />
                <circle cx="20" cy="16" r="14" fill="#5BA8D4" />
                <rect x="18" y="30" width="4" height="12" fill="#4A9AC9" rx="1" />
                <polygon points="16,42 24,42 20,48" fill="#2ECC71" />
              </svg>
            </div>
            <div className="absolute -right-8 -top-4">
              <svg width="36" height="50" viewBox="0 0 36 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="28" height="38" fill="#3498DB" rx="2" transform="rotate(-15 4 8)" />
                <rect x="6" y="10" width="24" height="34" fill="#F5DEB3" rx="1" transform="rotate(-15 6 10)" />
                <circle cx="30" cy="6" r="4" fill="#E74C3C" />
              </svg>
            </div>
            {/* Character face */}
            <div className="w-20 h-20 rounded-full bg-[#F5DEB3] flex items-center justify-center relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
                  {/* Curly hair */}
                  <circle cx="10" cy="20" r="10" fill="#6B4423" />
                  <circle cx="25" cy="12" r="12" fill="#6B4423" />
                  <circle cx="40" cy="15" r="11" fill="#6B4423" />
                  <circle cx="52" cy="22" r="8" fill="#6B4423" />
                </svg>
              </div>
              {/* Face */}
              <div className="flex flex-col items-center mt-2">
                <div className="flex gap-4 mb-2">
                  <div className="w-2 h-2 rounded-full bg-gray-800" />
                  <div className="w-2 h-2 rounded-full bg-gray-800" />
                </div>
                <div className="w-4 h-2 rounded-full bg-pink-300" />
              </div>
            </div>
          </div>
        </div>

        <p className="text-[#7CB9E8] text-sm mb-1">Персональный план готов!</p>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Начнем<br />рисовать?
        </h2>

        <button
          onClick={onStart}
          className="w-full py-3.5 rounded-full bg-[#4A90D9] text-white font-medium hover:bg-[#3A7BC8] transition-colors"
        >
          Да, начнем!
        </button>
      </DialogContent>
    </Dialog>
  );
};
