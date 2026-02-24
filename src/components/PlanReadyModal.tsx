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
        className="relative flex flex-col items-center text-center bg-white"
        style={{
          width: "clamp(340px, 90%, 680px)",
          padding: "40px 40px 32px 40px",
          borderRadius: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          overflow: "visible",
        }}
      >
        {/* Illustrations - absolutely positioned, overflow visible */}
        <img
          src={paintPalette}
          alt=""
          className="absolute pointer-events-none"
          style={{ top: "-100px", left: "-40px", width: "120px" }}
        />
        <img
          src={pencil}
          alt=""
          className="absolute pointer-events-none"
          style={{ top: "-30px", left: "-30px", width: "80px", transform: "rotate(-30deg)" }}
        />
        <img
          src={characterFace}
          alt=""
          className="absolute pointer-events-none"
          style={{ top: "-90px", left: "50%", transform: "translateX(-50%)", width: "140px" }}
        />
        <img
          src={graduationCap}
          alt=""
          className="absolute pointer-events-none"
          style={{ top: "-80px", right: "-40px", width: "120px" }}
        />

        {/* Text content */}
        <p
          className="text-foreground/70"
          style={{ fontSize: "22px", fontWeight: 500, marginTop: "70px" }}
        >
          Персональный план готов!
        </p>

        <h2
          className="text-foreground"
          style={{
            fontSize: "48px",
            fontWeight: 700,
            lineHeight: 1.1,
            margin: "16px 0 32px 0",
          }}
        >
          Начнем<br />рисовать?
        </h2>

        <button
          onClick={onStart}
          className="transition-all"
          style={{
            width: "75%",
            height: "56px",
            borderRadius: "28px",
            background: "#7FA8D8",
            fontSize: "18px",
            fontWeight: 500,
            color: "white",
            border: "none",
            cursor: "pointer",
            marginBottom: "8px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#6D99CF";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#7FA8D8";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Да, начнем!
        </button>
      </div>
    </div>
  );
};
