import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Search, Loader2, Compass } from "lucide-react";

function ChangeMapCenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

const pendingIcon = L.divIcon({
  className: "custom-pin-pending-container",
  html: `
    <div class="flex items-center justify-center" style="width: 32px; height: 32px;">
      <div class="w-7 h-7 rounded-full bg-red-100 border-2 border-red-600 flex items-center justify-center shadow-md">
        <div class="w-2.5 h-2.5 rounded-full bg-red-600"></div>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const verifiedIcon = L.divIcon({
  className: "custom-pin-verified-container",
  html: `
    <div class="flex items-center justify-center" style="width: 32px; height: 32px;">
      <div class="w-7 h-7 rounded-full bg-purple-100 border-2 border-purple-600 flex items-center justify-center shadow-md">
        <div class="w-2.5 h-2.5 rounded-full bg-purple-600"></div>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const assignedIcon = L.divIcon({
  className: "custom-pin-assigned-container",
  html: `
    <div class="flex items-center justify-center" style="width: 32px; height: 32px;">
      <div class="w-7 h-7 rounded-full bg-amber-100 border-2 border-amber-600 flex items-center justify-center shadow-md">
        <div class="w-2.5 h-2.5 rounded-full bg-amber-600"></div>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const resolvedIcon = L.divIcon({
  className: "custom-pin-resolved-container",
  html: `
    <div class="flex items-center justify-center" style="width: 32px; height: 32px;">
      <div class="w-7 h-7 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center shadow-md">
        <div class="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const selectedIcon = L.divIcon({
  className: "custom-pin-selected-container",
  html: `
    <div class="flex items-center justify-center" style="width: 36px; height: 36px;">
      <div class="w-9 h-9 rounded-full bg-emerald-600/30 border-2 border-emerald-600 flex items-center justify-center shadow-lg animate-bounce">
        <div class="w-3.5 h-3.5 rounded-full bg-emerald-600"></div>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

function MapEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

export const Map = ({ 
  reports = [], 
  hotspots = [],
  onMapClick, 
  selectedLocation, 
  center = [12.9716, 77.5946], 
  zoom = 13,
  showSearch = false,
  workerPath = null,
  onAddressResolved = null,
  isAdmin = false,
  onQuickAssign = null
}) => {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [mapCenter, setMapCenter] = useState(center);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  
  const markerRef = useRef(null);

  const triggerReverseGeocode = async (lat, lng) => {
    if (!onAddressResolved) return;
    setReverseGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        onAddressResolved(data.display_name || `Point at (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      } else {
        onAddressResolved(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (e) {
      console.error("Reverse geocoding error:", e);
      onAddressResolved(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setReverseGeocoding(false);
    }
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          if (onMapClick) {
            onMapClick({ lat: latLng.lat, lng: latLng.lng });
          }
          triggerReverseGeocode(latLng.lat, latLng.lng);
        }
      },
    }),
    [onMapClick]
  );

  useEffect(() => {
    if (selectedLocation) {
      setMapCenter([selectedLocation.lat, selectedLocation.lng]);
    }
  }, [selectedLocation]);

  const querySearch = async (val) => {
    setSearchQuery(val);
    if (val.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.map(item => ({
          label: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSuggestion = (sug) => {
    const coords = { lat: sug.lat, lng: sug.lng };
    if (onMapClick) {
      onMapClick(coords);
    }
    if (onAddressResolved) {
      onAddressResolved(sug.label);
    }
    setMapCenter([sug.lat, sug.lng]);
    setSuggestions([]);
    setSearchQuery("");
  };

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-10 flex flex-col bg-slate-50">
      {showSearch && (
        <div className="absolute top-4 left-4 right-4 md:left-12 md:right-12 z-[1000] flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg backdrop-blur-md max-w-md mx-auto">
          <div className="flex items-center px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => querySearch(e.target.value)}
              placeholder="Search area, neighborhood or city..."
              className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none p-0"
            />
            {searching && <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin ml-2" />}
            {reverseGeocoding && <Compass className="w-3.5 h-3.5 text-emerald-600 animate-pulse ml-2" />}
          </div>
          {suggestions.length > 0 && (
            <div className="border-t border-slate-200 max-h-48 overflow-y-auto text-left py-1 text-xs">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(sug)}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100 border-b border-slate-100 last:border-b-0 truncate font-sans cursor-pointer"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 w-full h-full relative">
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ width: "100%", height: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <ChangeMapCenter center={mapCenter} zoom={zoom} />

          {onMapClick && <MapEvents onMapClick={(latlng) => {
            onMapClick({ lat: latlng.lat, lng: latlng.lng });
            triggerReverseGeocode(latlng.lat, latlng.lng);
          }} />}

          {/* Hotspot Circles */}
          {hotspots.map((hs, idx) => (
            <Circle
              key={idx}
              center={[hs.lat, hs.lng]}
              radius={hs.count * 120}
              pathOptions={{
                color: hs.pending > 0 ? "#dc2626" : "#059669",
                fillColor: hs.pending > 0 ? "#ef4444" : "#10b981",
                fillOpacity: 0.25,
                weight: 2
              }}
            >
              <Popup>
                <div className="p-1 text-left font-sans text-xs">
                  <p className="font-extrabold text-slate-900">Waste Density Hotspot</p>
                  <p className="text-slate-600 mt-0.5">{hs.address || "Zone Cluster"}</p>
                  <p className="mt-1 font-bold text-red-600">{hs.count} Total Reports ({hs.pending} Pending)</p>
                  <p className="text-[10px] text-slate-500">Categories: {hs.mainCategory}</p>
                </div>
              </Popup>
            </Circle>
          ))}

          {selectedLocation && (
            <Marker 
              position={[selectedLocation.lat, selectedLocation.lng]} 
              icon={selectedIcon}
              draggable={true}
              eventHandlers={eventHandlers}
              ref={markerRef}
            >
              <Popup>
                <div className="p-1 text-left font-sans">
                  <p className="font-bold text-emerald-700 text-xs">Selected Location</p>
                  <p className="text-[10px] text-slate-600">Drag pin to adjust position.</p>
                </div>
              </Popup>
            </Marker>
          )}

          {reports.map((report) => {
            let icon = pendingIcon;
            if (report.status === "Completed" || report.status === "resolved") {
              icon = resolvedIcon;
            } else if (report.status === "Verified") {
              icon = verifiedIcon;
            } else if (report.status === "Assigned" || report.status === "Started" || report.status === "In Progress") {
              icon = assignedIcon;
            }
            
            const imgUrl = report.imageUrl
              ? report.imageUrl.startsWith("http")
                ? report.imageUrl
                : `${API_URL}${report.imageUrl}`
              : null;

            return (
              <Marker
                key={report.id}
                position={[report.lat, report.lng]}
                icon={icon}
              >
                <Popup>
                  <div className="w-60 p-1 flex flex-col font-sans text-left">
                    {imgUrl && (
                      <img
                        src={imgUrl}
                        alt={report.category}
                        className="w-full h-28 object-cover rounded-lg mb-2 border border-slate-200"
                      />
                    )}
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-sm text-slate-900">{report.category}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {report.status}
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-slate-600 mb-1 line-clamp-2">
                      📍 {report.address || "Geo-tagged position"}
                    </p>

                    <div className="text-[10px] text-slate-500 space-y-0.5 mb-2 border-t border-slate-100 pt-1 font-mono">
                      <p>Severity: <span className="font-bold text-slate-800">{report.severity || "Medium"}</span></p>
                      {report.assignedWorkerName && <p>Worker: <span className="font-bold text-amber-700">{report.assignedWorkerName}</span></p>}
                    </div>

                    {isAdmin && (report.status === "Submitted" || report.status === "Verified") && onQuickAssign && (
                      <button
                        onClick={() => onQuickAssign(report)}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase rounded-md shadow-xs cursor-pointer"
                      >
                        Assign Sanitation Task
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {workerPath && workerPath.length > 1 && (
            <Polyline
              positions={workerPath.map(p => [p.lat, p.lng])}
              color="#059669"
              dashArray="6, 8"
              weight={4}
              opacity={0.85}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};
