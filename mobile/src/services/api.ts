import axios from "axios";
import { API_URL } from "../constants/config";

// One ready-made connection to our backend
export const api = axios.create({
    baseURL: API_URL + "/api",
    timeout: 10000, // give up after 10 seconds
});

// Adds (or removes) the login token that proves who we are
export function setAuthToken(token: string | null) {
    if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common.Authorization;
    }
}

// Turns any error into a short message a person can read
export function errorMessage(err: unknown): string {
    if (axios.isAxiosError(err)) {
        if (err.response?.data?.message) return err.response.data.message;
        if (!err.response) {
            return "Cannot reach the server. Check your Wi-Fi and that the backend is running.";
        }
    }
    return "Something went wrong. Please try again.";
}