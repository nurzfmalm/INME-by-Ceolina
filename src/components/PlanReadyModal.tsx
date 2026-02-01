import { Dialog, DialogContent } from "@/components/ui/dialog";
import characterFace from "@/assets/character-face.png";
import graduationCap from "@/assets/graduation-cap.png";
import pencil from "@/assets/pencil.png";
import paintPalette from "@/assets/paint-palette.png";

interface PlanReadyModalProps {
  open: boolean;
  onStart: () => void;
}

export const PlanReadyModal = ({ open, onStart }: PlanReadyModalProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-sm bg-white rounded-3xl p-8 text-center border-0 shadow-xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Decorative elements container */}
        <div className="relative flex justify-center mb-4">
          {/* Paint palette - left */}
          <img 
            src={paintPalette} 
            alt="" 
            className="absolute -left-4 top-0 w-14 h-auto -rotate-12 pointer-events-none"
          />
          
          {/* Character face - center */}
          <img 
            src={characterFace} 
            alt="" 
            className="w-28 h-auto relative z-10"
          />
          
          {/* Graduation cap - top right */}
          <img 
            src={graduationCap} 
            alt="" 
            className="absolute -right-2 -top-4 w-14 h-auto rotate-6 pointer-events-none"
          />
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
