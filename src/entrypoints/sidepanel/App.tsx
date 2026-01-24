import { wallpapers } from '@/config/wallpapers';

function TabItem() {
  return (
    <div>
      Favicon
      Tab Item
    </div>
  )
}

function App() {
  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "#000",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        padding: "20px",
      }}
    >
      {/* 🌈 SOFT GLOW LAYER (the “sun” effect) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
        radial-gradient(circle at 20% 30%, rgba(255,0,128,0.35), transparent 40%),
        radial-gradient(circle at 80% 20%, rgba(0,200,255,0.35), transparent 40%),
        radial-gradient(circle at 60% 80%, rgba(120,100,255,0.35), transparent 45%),
        radial-gradient(circle at 30% 70%, rgba(0,255,180,0.30), transparent 45%)
      `,
          filter: "blur(80px)",
          opacity: 0.9,
          pointerEvents: "none",
        }}
      />

      {/* 🎨 GRADIENT ICON COLOR LAYER */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(120deg,
        #ff0080,
        #ff8c00,
        #40e0d0,
        #7b68ee,
        #00c9ff,
        #92fe9d
      )`,
          backgroundSize: "200% 200%",

          WebkitMaskImage: `url(${wallpapers[0].url})`,
          maskImage: `url(${wallpapers[0].url})`,
          WebkitMaskRepeat: "repeat",
          maskRepeat: "repeat",
          WebkitMaskSize: "180px",
          maskSize: "180px",

          opacity: 0.85,
          pointerEvents: "none",
        }}
      />

      {/* 🌑 subtle dark vignette for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.6))",
          pointerEvents: "none",
        }}
      />

      {/* CONTENT */}
      <div className="relative z-10 text-white">
        <div className="bg-gray-900/90 p-6 rounded-xl">hi</div>
      </div>
    </div>


  );
}

export default App;
