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
        className="relative"
        style={{
          width: "700px",
          maxWidth: "92%",
          overflow: "visible",
        }}
      >
        {/* Illustrations — positioned above the white card */}
        <img src={pencil} alt="" className="absolute pointer-events-none" style={{ left: "-40px", top: "-20px", width: "120px", transform: "rotate(-25deg)" }} />
        <img src={paintPalette} alt="" className="absolute pointer-events-none" style={{ left: "100px", top: "-100px", width: "160px" }} />
        <img src={characterFace} alt="" className="absolute pointer-events-none left-1/2" style={{ top: "-80px", width: "200px", transform: "translateX(-50%)", zIndex: 2 }} />
        <img src={graduationCap} alt="" className="absolute pointer-events-none" style={{ right: "-30px", top: "-80px", width: "160px" }} />

        {/* White card */}
        <div
          className="bg-white flex flex-col items-center text-center"
          style={{
            marginTop: "100px",
            borderRadius: "24px",
            padding: "80px 48px 40px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
          }}
        >
          <p className="text-foreground/70" style={{ fontSize: "20px", fontWeight: 500 }}>
            Персональный план готов!
          </p>

          <h2
            className="text-foreground"
            style={{
              fontSize: "52px",
              fontWeight: 800,
              lineHeight: 1.1,
              margin: "14px 0 28px 0",
            }}
          >
            Начнем<br />рисовать?
          </h2>

          <button
            onClick={onStart}
            className="transition-all hover:brightness-95"
            style={{
              width: "65%",
              height: "52px",
              borderRadius: "26px",
              background: "#7FB8E8",
              fontSize: "18px",
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
