import { API_URL } from "../constants/config";
import { getAuthToken } from "./api";

export type UploadResult = {
    ok: boolean;
    status: number;
    data: { message?: string };
};

// Sends text fields plus one file to the backend.
// We use XMLHttpRequest on purpose: newer Expo versions changed fetch(), but
// XMLHttpRequest still understands React Native's { uri, name, type } file format.
export function uploadForm(
    path: string,
    fields: Record<string, string>,
    file: { field: string; uri: string; name: string; type: string }
): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        Object.entries(fields).forEach(([key, value]) => form.append(key, value));
        form.append(file.field, {
            uri: file.uri,
            name: file.name,
            type: file.type,
        } as unknown as Blob);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_URL}${path}`);
        xhr.setRequestHeader("Authorization", `Bearer ${getAuthToken()}`);
        xhr.timeout = 30000; // give up after 30 seconds

        xhr.onload = () => {
            let data: { message?: string } = {};
            try {
                data = JSON.parse(xhr.responseText);
            } catch {
                // the server sent something that is not JSON
            }
            resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
        };
        xhr.onerror = () => reject(new Error("Network request failed"));
        xhr.ontimeout = () => reject(new Error("The upload took too long"));

        xhr.send(form);
    });
}