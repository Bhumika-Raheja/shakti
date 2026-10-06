// The address of the Shakti backend.
// Use your laptop's IPv4 address from the command: ipconfig
// It changes when you switch Wi-Fi networks, so update it here when it does.
// (When the backend is deployed online, this becomes its web address.)
export const API_URL = "http://10.73.49.1:5000";

// While testing, pretend the phone is in Indiranagar, Bangalore, next to the
// test volunteers in the database. Set this to false to use the real GPS.
export const USE_TEST_LOCATION = true;
export const TEST_LOCATION = { lat: 12.9784, lng: 77.6408 };