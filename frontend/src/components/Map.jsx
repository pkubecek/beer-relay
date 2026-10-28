import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button, Input } from "./ui";

const CZ_CENTER = [49.8, 15.5];
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Značka ve stylu kontroly OB (kroužek), bez obrázkových ikon Leafletu.
const markerIcon = L.divIcon({
  className: "",
  html: '<div class="map-control"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function useLeafletMap(ref, { center, zoom, interactive = true }) {
  const mapRef = useRef(null);
  useEffect(() => {
    const map = L.map(ref.current, {
      center,
      zoom,
      scrollWheelZoom: interactive,
      dragging: interactive || !L.Browser.mobile,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => map.remove();
    // mapa se vytváří jen jednou
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return mapRef;
}

async function nominatim(path, params) {
  const qs = new URLSearchParams({ format: "jsonv2", "accept-language": "cs", ...params });
  const res = await fetch(`https://nominatim.openstreetmap.org/${path}?${qs}`);
  if (!res.ok) throw new Error("Vyhledávání se nezdařilo");
  return res.json();
}

function shortLabel(item) {
  const a = item.address || {};
  const place = a.village || a.town || a.city || a.hamlet || a.suburb || a.municipality;
  const parts = [item.name, place].filter((x, i, arr) => x && arr.indexOf(x) === i);
  return parts.join(", ") || item.display_name;
}

/** Výběr místa závodu na mapě: klik / přetažení značky / hledání. */
export function MapPicker({ lat, lon, onChange }) {
  const el = useRef(null);
  const markerRef = useRef(null);
  const hasPoint = lat != null && lon != null;
  const mapRef = useLeafletMap(el, { center: hasPoint ? [lat, lon] : CZ_CENTER, zoom: hasPoint ? 14 : 7 });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  async function pick(latlng, label) {
    const point = { lat: +latlng.lat.toFixed(6), lon: +latlng.lng.toFixed(6) };
    if (label) return onChangeRef.current({ ...point, label });
    onChangeRef.current(point);
    try {
      const r = await nominatim("reverse", { lat: point.lat, lon: point.lon, zoom: 16, addressdetails: 1 });
      if (r && !r.error) onChangeRef.current({ ...point, label: shortLabel(r) });
    } catch {
      /* název je jen bonus */
    }
  }

  // klik do mapy
  useEffect(() => {
    const map = mapRef.current;
    const handler = (e) => pick(e.latlng);
    map.on("click", handler);
    return () => map.off("click", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // synchronizace značky s lat/lon
  useEffect(() => {
    const map = mapRef.current;
    if (!hasPoint) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lon], { icon: markerIcon, draggable: true }).addTo(map);
      markerRef.current.on("dragend", (e) => pick(e.target.getLatLng()));
    } else {
      markerRef.current.setLatLng([lat, lon]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, hasPoint]);

  async function search(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError("");
    try {
      const r = await nominatim("search", { q: query, countrycodes: "cz,sk", limit: 6, addressdetails: 1 });
      setResults(r);
      if (!r.length) setError("Nic nenalezeno");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function choose(item) {
    const latlng = L.latLng(+item.lat, +item.lon);
    mapRef.current.setView(latlng, 15);
    setResults([]);
    pick(latlng, shortLabel(item));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Hledat obec, hospodu, adresu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search(e)}
        />
        <Button type="button" variant="outline" onClick={search} disabled={busy}>
          {busy ? "…" : "Hledat"}
        </Button>
      </div>
      {error && <p className="text-xs text-punch">{error}</p>}
      {results.length > 0 && (
        <ul className="border border-line rounded-xl bg-white divide-y divide-wood/10 text-sm max-h-48 overflow-auto">
          {results.map((r) => (
            <li key={r.place_id}>
              <button type="button" onClick={() => choose(r)} className="w-full text-left px-3 py-2 hover:bg-forest-50">
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={el} className="h-72 rounded-xl border border-line isolate" />
      <div className="flex items-center justify-between text-xs text-forest-700/60">
        <span>
          {hasPoint ? `📍 ${lat.toFixed(5)}, ${lon.toFixed(5)} – značku můžeš přetáhnout` : "Klikni do mapy na místo startu / srazu."}
        </span>
        {hasPoint && (
          <button type="button" className="text-punch hover:underline" onClick={() => onChange({ lat: null, lon: null })}>
            Odebrat bod
          </button>
        )}
      </div>
    </div>
  );
}

/** Jen pro čtení – mapa místa závodu na veřejné stránce. */
export function EventMap({ lat, lon, label }) {
  const el = useRef(null);
  const mapRef = useLeafletMap(el, { center: [lat, lon], zoom: 14, interactive: false });

  useEffect(() => {
    const marker = L.marker([lat, lon], { icon: markerIcon }).addTo(mapRef.current);
    if (label) marker.bindTooltip(label);
    mapRef.current.setView([lat, lon]);
    return () => marker.remove();
  }, [lat, lon, label, mapRef]);

  return (
    <div>
      <div ref={el} className="h-56 rounded-xl border border-line isolate" />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-1.5">
        <a className="text-wood hover:underline" target="_blank" rel="noreferrer"
          href={`https://mapy.cz/turisticka?q=${lat},${lon}&x=${lon}&y=${lat}&z=15`}>
          Otevřít v Mapy.cz ↗
        </a>
        <a className="text-wood hover:underline" target="_blank" rel="noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`}>
          Navigovat (Google) ↗
        </a>
        <span className="text-forest-700/50 font-mono">{lat.toFixed(5)}, {lon.toFixed(5)}</span>
      </div>
    </div>
  );
}
