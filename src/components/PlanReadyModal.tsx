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
          width: "560px",
          maxWidth: "90%",
          borderRadius: "22px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.13)",
          overflow: "visible",
        }}
      >
        {/* Hero zone — illustrations */}
        <div className="relative" style={{ height: "90px" }}>
          <img src={paintPalette} alt="" className="absolute pointer-events-none" style={{ left: "70px", top: "-6px", width: "70px" }} />
          <img src={pencil} alt="" className="absolute pointer-events-none" style={{ left: "30px", top: "30px", width: "48px", transform: "rotate(-18deg)" }} />
          <img src={characterFace} alt="" className="absolute pointer-events-none left-1/2" style={{ top: "4px", width: "120px", transform: "translateX(-50%)" }} />
          <img src={graduationCap} alt="" className="absolute pointer-events-none" style={{ right: "56px", top: "-4px", width: "74px" }} />
        </div>

        {/* Inner card */}
        <div
          className="bg-white flex flex-col items-center text-center"
          style={{
            margin: "-14px 20px 20px",
            borderRadius: "18px",
            padding: "20px 32px 22px",
            boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
          }}
        >
          <p className="text-foreground/45" style={{ fontSize: "16px", fontWeight: 400 }}>
            Персональный план готов!
          </p>

          <h2
            className="text-foreground"
            style={{
              fontSize: "44px",
              fontWeight: 700,
              lineHeight: 1.12,
              margin: "10px 0 22px 0",
            }}
          >
            Начнем<br />рисовать?
          </h2>

          <button
            onClick={onStart}
            className="transition-all hover:brightness-95"
            style={{
              width: "58%",
              height: "42px",
              borderRadius: "21px",
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
