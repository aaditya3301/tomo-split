import { BrowserRouter, Routes, Route } from "react-router-dom";

const SimpleApp = () => (
  <BrowserRouter>
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-4xl font-bold mb-4">Creator Economy Hooks</h1>
      <p className="text-xl text-muted-foreground mb-8">
        If you can see this, the basic React app is working!
      </p>
      <div className="space-y-4">
        <p>✅ React is loaded</p>
        <p>✅ Tailwind CSS is working</p>
        <p>✅ Router is functional</p>
        <p>⏳ Wallet integration pending...</p>
      </div>
      <Routes>
        <Route path="/" element={<div>Home Route</div>} />
        <Route path="/test" element={<div>Test Route</div>} />
      </Routes>
    </div>
  </BrowserRouter>
);

export default SimpleApp;
