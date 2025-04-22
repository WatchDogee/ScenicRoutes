import { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ScenicRoutesFinder() {
  const [radius, setRadius] = useState(10);
  const [roadType, setRoadType] = useState('all');
  const [curvatureType, setCurvatureType] = useState('all');
  const [poiType, setPoiType] = useState('all');
  const [map, setMap] = useState(null);

  useEffect(() => {
    const leafletMap = L.map('map').setView([51.505, -0.09], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(leafletMap);

    setMap(leafletMap);
  }, []);

  const updateRadiusLabel = (e) => {
    setRadius(Number(e.target.value));
  };

  const searchRoads = () => {
    console.log({ radius, roadType, curvatureType, poiType });
  };

  return (
    <div className="flex h-screen">
      <div className="w-80 p-4 bg-white shadow-md overflow-y-auto">
        <div>
          <h2 className="text-lg font-bold mb-2">Login</h2>
          <input type="text" placeholder="Username" className="w-full mb-2 p-1 border" />
          <input type="password" placeholder="Password" className="w-full mb-2 p-1 border" />
          <button className="bg-blue-500 text-white w-full p-1 mb-2">Login</button>
          <Link href="/register" className="text-sm text-blue-600">Sign up</Link>
          <hr className="my-4" />
        </div>

        <div>
          <h3 className="font-semibold mb-2">Filters</h3>
          <label>Search Radius: {radius} km</label>
          <input type="range" min="1" max="50" value={radius} onChange={updateRadiusLabel} className="w-full mb-4" />

          <label>Road Type</label>
          <select value={roadType} onChange={(e) => setRoadType(e.target.value)} className="w-full mb-2">
            <option value="all">All Roads</option>
            <option value="primary">Primary Roads</option>
            <option value="secondary">Secondary Roads</option>
          </select>

          <label>Curvature Type</label>
          <select value={curvatureType} onChange={(e) => setCurvatureType(e.target.value)} className="w-full mb-2">
            <option value="all">All Curves</option>
            <option value="curvy">Very Curved</option>
            <option value="moderate">Medium Curved</option>
            <option value="mellow">Mellow</option>
          </select>

          <label>POI Type</label>
          <select value={poiType} onChange={(e) => setPoiType(e.target.value)} className="w-full mb-2">
            <option value="all">All POIs</option>
            <option value="fuel">Gas Stations</option>
            <option value="tourism">Tourism Spots</option>
            <option value="others">Shops/Restaurants</option>
          </select>

          <button onClick={searchRoads} className="bg-green-500 text-white w-full p-1 mt-2">Find Roads</button>
        </div>

        <div className="mt-4">
          <ul id="savedRoadsList"></ul>
        </div>
      </div>

      <div className="flex-1" id="map"></div>
    </div>
  );
}
