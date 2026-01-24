import BackgroundFX from '@/views/layout/background-fx';
import { TabPanel } from '@/components/layout/TabPanel';
import { useTabSync } from '@/hooks/useTabSync';

function App() {
  useTabSync();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black p-5">
      <BackgroundFX />

      <div className="relative z-10 text-white">
        <TabPanel />
      </div>
    </div>
  );
}

export default App;
