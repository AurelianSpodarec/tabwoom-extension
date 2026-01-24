import { wallpapers } from "@/config/wallpapers";

function SoftGlow() {
  return (
    <div className="fx-layer fx-glow" />
  );
}

function MaskedGradient() {
  return (
    <div
      className="fx-layer fx-gradient-mask"
      style={{
        WebkitMaskImage: `url(${wallpapers[0].url})`,
        maskImage: `url(${wallpapers[0].url})`,
      }}
    />
  );
}

function Vignette() {
  return <div className="fx-layer fx-vignette" />;
}

function BackgroundFX() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <SoftGlow />
      <MaskedGradient />
      <Vignette />
    </div>
  );
}

export default BackgroundFX;