import { useState, useEffect } from "react";

const geocodeCache = new Map<string, string>();

export function useHumanLocation(location: string) {
  const [humanLoc, setHumanLoc] = useState<string>(location);

  useEffect(() => {
    // Basic regex to check for latitude, longitude coordinates
    const match = location.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (!match) {
      setHumanLoc(location);
      return;
    }
    
    if (geocodeCache.has(location)) {
      setHumanLoc(geocodeCache.get(location)!);
      return;
    }

    const lat = match[1];
    const lon = match[3];

    // Simple fetch without headers to bypass CORS if possible, or OpenStreetMap allows it.
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
      .then(res => res.json())
      .then(data => {
        if (data.address) {
          const loc = data.address.city || data.address.town || data.address.village || data.address.state || data.address.country || location;
          geocodeCache.set(location, loc);
          setHumanLoc(loc);
        }
      })
      .catch(() => {
        // Fallback to formatted coords
        const formatted = `Lat: ${parseFloat(lat).toFixed(2)}, Lon: ${parseFloat(lon).toFixed(2)}`;
        geocodeCache.set(location, formatted);
        setHumanLoc(formatted);
      });
  }, [location]);

  return humanLoc;
}
