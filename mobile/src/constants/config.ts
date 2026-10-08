// The address of the Shakti backend.
// Use your laptop's IPv4 address from the command: ipconfig
// It changes when you switch Wi-Fi networks, so update it here when it does.
// (When the backend is deployed online, this becomes its web address.)
export const API_URL = "https://shakti-2win.onrender.com";

// While testing, pretend the phone is in Indiranagar, Bangalore, next to the
// test volunteers in the database. Set this to false to use the real GPS.
export const USE_TEST_LOCATION = true;
export const TEST_LOCATION = { lat: 12.9784, lng: 77.6408 }; // the woman
export const TEST_VOLUNTEER_LOCATION = { lat: 12.979, lng: 77.643 }; // a volunteer, about 250 m away