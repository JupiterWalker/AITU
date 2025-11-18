
import './App.css';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import GraphPage from './components/GraphPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/graph/:id" element={<GraphPage />} />
    </Routes>
  );
}

export default App;
