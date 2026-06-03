/**
 * Mock geocoding service. In a real application, this would call 
 * an external API like Google Maps, Mapbox, or OpenStreetMap (Nominatim).
 */

const locationMap: Record<string, { lat: number, lng: number }> = {
    "lonavala": { lat: 18.7481, lng: 73.4072 },
    "mumbai": { lat: 19.0760, lng: 72.8777 },
    "pune": { lat: 18.5204, lng: 73.8567 },
    "goa": { lat: 15.2993, lng: 74.1240 },
    "delhi": { lat: 28.6139, lng: 77.2090 },
    "bangalore": { lat: 12.9716, lng: 77.5946 },
};

export async function geocode(location: string): Promise<{ lat: number, lng: number } | null> {
    if (!location) return null;
    
    const normalized = location.toLowerCase().trim();
    return locationMap[normalized] || null;
}
