import characterFace from "@/assets/character-face.png";
import graduationCap from "@/assets/graduation-cap.png";
import pencil from "@/assets/pencil.png";
import paintPalette from "@/assets/paint-palette.png";

interface PlanReadyModalProps {
  open: boolean;
  onStart: () => void;
}

export const PlanReadyModal = ({ open, onStart }: PlanReadyModalProps) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{
        background: "rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div
        className="relative bg-white"
        style={{
          width: "420px",
          maxWidth: "85%",
          borderRadius: "20px",
          boxShadow: "0 10px 36px rgba(0,0,0,0.12)",
          overflow: "visible",
        }}
      >
        {/* Hero — thin zone for illustrations */}
        <div className="relative" style={{ height: "80px" }}>
          <img src={paintPalette} alt="" className="absolute pointer-events-none" style={{ left: "50px", top: "-8px", width: "80px" }} />
          <img src={pencil} alt="" className="absolute pointer-events-none" style={{ left: "18px", top: "28px", width: "56px", transform: "rotate(-18deg)" }} />
          <img src={characterFace} alt="" className="absolute pointer-events-none left-1/2" style={{ top: "6px", width: "110px", transform: "translateX(-50%)" }} />
          <img src={graduationCap} alt="" className="absolute pointer-events-none" style={{ right: "36px", top: "-2px", width: "86px" }} />
        </div>

        {/* Inner card */}
        <div
          className="bg-white flex flex-col items-center text-center"
          style={{
            margin: "-12px 16px 16px",
            borderRadius: "16px",
            padding: "18px 28px 20px",
            boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
          }}
        >
          <p className="text-foreground/50" style={{ fontSize: "15px", fontWeight: 400 }}>
            Персональный план готов!
          </p>

          <h2
            className="text-foreground"
            style={{
              fontSize: "40px",
              fontWeight: 700,
              lineHeight: 1.1,
              margin: "8px 0 20px 0",
            }}
          >
            Начнем<br />рисовать?
          </h2>

          <button
            onClick={onStart}
            className="transition-all hover:brightness-95"
            style={{
              width: "62%",
              height: "40px",
              borderRadius: "20px",
              background: "#7FB8E8",
              fontSize: "15px",
              fontWeight: 500,
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Да, начнем!
          </button>
        </div>
      </div>
    </div>
  );
};
