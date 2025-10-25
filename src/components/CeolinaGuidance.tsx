import ceolinaCharacter from "@/assets/ceolina-character.png";

interface CeolinaGuidanceProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

export const CeolinaGuidance = ({ message, visible, onClose }: CeolinaGuidanceProps) => {
  if (!visible) return null;

  return (
    <div className="fixed bottom-24 right-8 z-50 animate-scale-in">
      <div className="relative bg-white rounded-2xl shadow-float p-6 max-w-sm border-2 border-primary">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
        <div className="flex items-start gap-4">
          <img
            src={ceolinaCharacter}
            alt="Ceolina"
            className="w-16 h-16 animate-gentle-float"
          />
          <div className="flex-1">
            <p className="font-semibold text-primary mb-1">Ceolina говорит:</p>
            <p className="text-sm">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
