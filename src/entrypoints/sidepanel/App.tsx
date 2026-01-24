
import BackgroundFX from "@/views/layout/background-fx";

function App() {
  return (
      <div className="relative min-h-screen w-full overflow-hidden bg-black p-5">
      <BackgroundFX />

      <div className="relative z-10 text-white">
        Content
      </div>
    </div>
  );
}

export default App;
