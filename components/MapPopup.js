import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function LocationSelector({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function MapPopup({
  lat,
  lng,
  isEditing = false,
  onPositionChange = () => {},
}) {
  // Start with the marker at given lat/lng
  const [markerPosition, setMarkerPosition] = useState([lat, lng]);

  useEffect(() => {
    setMarkerPosition([lat, lng]);
  }, [lat, lng]);

  const truncate6dp = (num) => Math.floor(num * 1e6) / 1e6;

  useEffect(() => {
    onPositionChange({ 
      lat: truncate6dp(markerPosition[0]), 
      lng: truncate6dp(markerPosition[1] )
    });
  }, [markerPosition, onPositionChange]);

  return (
    <MapContainer
      center={[1.3483, 103.6831]} // fixed center, no change
      zoom={15}
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="&copy; <a href='https://www.esri.com/'>Esri</a>, Earthstar Geographics"
      />
      {isEditing ? (
        <LocationSelector position={markerPosition} setPosition={setMarkerPosition} />
      ) : (
        <Marker position={[lat, lng]} />
      )}
    </MapContainer>
  );
}

