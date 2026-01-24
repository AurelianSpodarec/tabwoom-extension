import './../../styles/App.css';
import { Button } from '@/components';
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
        backgroundImage: `
          linear-gradient(135deg, rgba(255,167,38,0.4) 0%, rgba(255,112,67,0.4) 100%),
          url(${wallpapers[0].url})
        `,
        backgroundSize: '150px',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
        backgroundRepeat: 'repeat',
        minHeight: '100vh',
        padding: '20px',
      }}
    >
      <div className="bg-red-900">hi</div>
    </div>
  );
}

export default App;
