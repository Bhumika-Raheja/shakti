// Straight-line distance between two points on Earth, in meters
export function distanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
) {
    const R = 6371000; // Earth's radius in meters
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// How many minutes to walk this far (about 5 km/h, so 80 m per minute)
export function walkingMinutes(meters: number) {
    return Math.max(1, Math.ceil(meters / 80));
}