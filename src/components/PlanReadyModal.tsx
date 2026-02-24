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
      {/* Modal container */}
      <div
        className="relative bg-white"
        style={{
          width: "520px",
          maxWidth: "90%",
          borderRadius: "20px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          overflow: "visible",
        }}
      >
        {/* Hero area for illustrations */}
        <div className="relative" style={{ height: "120px" }}>
          <img
            src={paintPalette}
            alt=""
            className="absolute pointer-events-none"
            style={{ left: "60px", top: "-10px", width: "110px" }}
          />
          <img
            src={pencil}
            alt=""
            className="absolute pointer-events-none"
            style={{ left: "22px", top: "34px", width: "80px", transform: "rotate(-18deg)" }}
          />
          <img
            src={characterFace}
            alt=""
            className="absolute pointer-events-none left-1/2"
            style={{ top: "18px", width: "150px", transform: "translateX(-50%)" }}
          />
          <img
            src={graduationCap}
            alt=""
            className="absolute pointer-events-none"
            style={{ right: "44px", top: "0px", width: "120px" }}
          />
        </div>

        {/* Inner white card */}
        <div
          className="bg-white flex flex-col items-center text-center"
          style={{
            margin: "-22px 18px 18px",
            borderRadius: "18px",
            padding: "26px 34px 24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <p className="text-foreground/60" style={{ fontSize: "18px", fontWeight: 500 }}>
            Персональный план готов!
          </p>

          <h2
            className="text-foreground"
            style={{
              fontSize: "54px",
              fontWeight: 800,
              lineHeight: 1.1,
              margin: "12px 0 28px 0",
              textShadow: "0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            Начнем<br />рисовать?
          </h2>

          <button
            onClick={onStart}
            className="transition-all hover:brightness-95"
            style={{
              width: "68%",
              height: "44px",
              borderRadius: "22px",
              background: "#7FA8D8",
              fontSize: "16px",
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
