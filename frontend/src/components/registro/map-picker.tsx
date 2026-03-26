"use client";

import { useEffect, useRef } from "react";
import { MapPin, Navigation } from "lucide-react";

// Tarija city center
const TARIJA_CENTER: [number, number] = [-21.5355, -64.7296];
const DEFAULT_ZOOM = 14;

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

/**
 * Renders an interactive Leaflet map.
 * Imported with dynamic({ ssr: false }) to avoid SSR issues.
 */
export function MapPickerLeaflet({ lat, lng, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamically import leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      if (!containerRef.current) return;

      // Fix default icon URLs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center: [number, number] =
        lat !== null && lng !== null ? [lat, lng] : TARIJA_CENTER;

      const map = L.map(containerRef.current).setView(center, DEFAULT_ZOOM);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Initial marker
      if (lat !== null && lng !== null) {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onChange(
            Math.round(pos.lat * 1e7) / 1e7,
            Math.round(pos.lng * 1e7) / 1e7
          );
        });
      }

      // Click to set / move marker
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        const roundedLat = Math.round(clickLat * 1e7) / 1e7;
        const roundedLng = Math.round(clickLng * 1e7) / 1e7;

        if (markerRef.current) {
          markerRef.current.setLatLng([roundedLat, roundedLng]);
        } else {
          const marker = L.marker([roundedLat, roundedLng], {
            draggable: true,
          }).addTo(map);
          markerRef.current = marker;
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            onChange(
              Math.round(pos.lat * 1e7) / 1e7,
              Math.round(pos.lng * 1e7) / 1e7
            );
          });
        }

        onChange(roundedLat, roundedLng);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep marker in sync with external lat/lng changes (e.g. geolocation)
  useEffect(() => {
    if (!mapRef.current || lat === null || lng === null) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    }
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full rounded-xl border border-border z-0"
    />
  );
}

// ── Wrapper del mapa con controles ───────────────────────────────────────────

interface MapSectionProps {
  lat: number | null;
  lng: number | null;
  onLatChange: (v: string) => void;
  onLngChange: (v: string) => void;
  onMapClick: (lat: number, lng: number) => void;
}

export function MapSection({
  lat,
  lng,
  onLatChange,
  onLngChange,
  onMapClick,
}: MapSectionProps) {
  function handleGeolocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onLatChange(String(Math.round(latitude * 1e7) / 1e7));
        onLngChange(String(Math.round(longitude * 1e7) / 1e7));
        onMapClick(latitude, longitude);
      },
      () => alert("No se pudo obtener la ubicación del dispositivo.")
    );
  }

  return (
    <div className="space-y-3">
      {/* Controles de coordenadas */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Latitud
          </label>
          <input
            type="number"
            step="any"
            value={lat ?? ""}
            onChange={(e) => onLatChange(e.target.value)}
            placeholder="-21.5355"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Longitud
          </label>
          <input
            type="number"
            step="any"
            value={lng ?? ""}
            onChange={(e) => onLngChange(e.target.value)}
            placeholder="-64.7296"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={handleGeolocate}
          className="h-9 px-3 flex items-center gap-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <Navigation size={13} />
          Usar mi ubicación
        </button>
      </div>

      {/* Instrucción */}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin size={12} />
        Haz clic en el mapa para fijar la ubicación o arrastra el marcador.
      </p>

      {/* Mapa */}
      <MapPickerLeaflet lat={lat} lng={lng} onChange={onMapClick} />
    </div>
  );
}
