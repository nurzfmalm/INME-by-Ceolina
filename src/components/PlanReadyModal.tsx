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
        className="max-w-md bg-white rounded-3xl px-8 pb-8 pt-4 text-center border-0 shadow-xl [&>button]:hidden overflow-visible"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Decorative illustrations */}
        <div className="relative flex justify-center mb-2 h-36">
          {/* Paint palette - top left */}
          <img 
            src={paintPalette} 
            alt="" 
            className="absolute -left-8 -top-6 w-24 h-auto -rotate-12 pointer-events-none z-20"
          />
          
          {/* Pencil - bottom left */}
          <img 
            src={pencil} 
            alt="" 
            className="absolute -left-10 bottom-0 w-16 h-auto -rotate-45 pointer-events-none z-20"
          />
          
          {/* Character face - center */}
          <img 
            src={characterFace} 
            alt="" 
            className="w-36 h-auto relative z-10 mt-2"
          />
          
          {/* Graduation cap - top right */}
          <img 
            src={graduationCap} 
            alt="" 
            className="absolute -right-6 -top-4 w-24 h-auto rotate-6 pointer-events-none z-20"
          />
        </div>

        <p className="text-muted-foreground text-base mb-1">Персональный план готов!</p>
        
        <h2 className="text-3xl font-bold text-foreground mb-8 leading-tight">
          Начнем<br />рисовать?
        </h2>

        <button
          onClick={onStart}
          className="w-full py-4 rounded-full bg-[#7CB9E8] text-white text-lg font-medium hover:bg-[#6AABE0] transition-colors"
        >
          Да, начнем!
        </button>
      </DialogContent>
    </Dialog>
  );
};
