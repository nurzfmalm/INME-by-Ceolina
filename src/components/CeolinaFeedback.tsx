import { Card } from "@/components/ui/card";
import ceolinaCharacter from "@/assets/ceolina-character.png";
import { Sparkles } from "lucide-react";

interface CeolinaFeedbackProps {
  message: string;
  visible?: boolean;
}

export const CeolinaFeedback = ({ message, visible = true }: CeolinaFeedbackProps) => {
  if (!visible) return null;

  return (
    <Card className="p-6 border-0 bg-gradient-warm shadow-float animate-scale-in">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative">
          <img
            src={ceolinaCharacter}
            alt="Ceolina"
            className="w-24 h-24 animate-gentle-float"
          />
          <div className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-soft">
            <Sparkles className="text-primary" size={20} />
          </div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-bold text-primary-foreground mb-2 text-lg flex items-center justify-center md:justify-start gap-2">
            <Sparkles size={18} />
            Ceolina говорит:
          </h3>
          <p className="text-primary-foreground/90 italic text-lg leading-relaxed">
            "{message}"
          </p>
        </div>
      </div>
    </Card>
  );
};
