import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { colors, radius } from "../constants/theme";

export type MapReport = {
    id: string;
    lat: number;
    lng: number;
    color: string; // pink = few reports nearby, red = many
    label: string; // shown when you tap the circle
};

type Point = { lat: number; lng: number };

// A small web page (Leaflet) shown inside the app, like the live map.
const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #FFF0F4; }
  .you { background: #2B2B2B; color: #fff; font: 700 12px sans-serif; padding: 3px 10px;
         border-radius: 12px; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.35);
         white-space: nowrap; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: false }).setView([20.5937, 78.9629], 4);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);

  window.update = function (d) {
    layer.clearLayers();
    if (!d.me) return;

    // The search area: a dashed circle around the user
    var area = L.circle([d.me.lat, d.me.lng], {
      radius: d.radius, color: '#D81B60', weight: 1, dashArray: '4 6',
      fillColor: '#D81B60', fillOpacity: 0.03
    }).addTo(layer);

    // One circle per report. Tapping it shows what it is.
    (d.reports || []).forEach(function (r) {
      var c = L.circleMarker([r.lat, r.lng], {
        radius: 11, color: '#ffffff', weight: 2, fillColor: r.color, fillOpacity: 0.85
      }).addTo(layer);
      var el = document.createElement('div');
      el.textContent = r.label; // textContent keeps the text safe
      c.bindPopup(el);
    });

    // "You"
    var you = document.createElement('div');
    you.className = 'you';
    you.textContent = 'You';
    L.marker([d.me.lat, d.me.lng], {
      icon: L.divIcon({ html: you, className: '', iconSize: [44, 22], iconAnchor: [22, 11] })
    }).addTo(layer);

    map.fitBounds(area.getBounds(), { padding: [10, 10] });
  };
</script>
</body>
</html>`;

export default function ReportsMap({
    me,
    radiusMeters,
    reports,
    height = 320,
}: {
    me: Point | null;
    radiusMeters: number;
    reports: MapReport[];
    height?: number;
}) {
    const ref = useRef<WebView>(null);
    const [ready, setReady] = useState(false);

    // Every time the data changes, send it to the map page
    useEffect(() => {
        if (!ready) return;
        const data = JSON.stringify({ me, radius: radiusMeters, reports });
        ref.current?.injectJavaScript(`if (window.update) { window.update(${data}); } true;`);
    }, [ready, me, radiusMeters, reports]);

    return (
        <View style={[styles.box, { height }]}>
            <WebView
                ref={ref}
                source={{ html: HTML }}
                originWhitelist={["*"]}
                javaScriptEnabled
                nestedScrollEnabled
                onLoadEnd={() => setReady(true)}
                style={styles.web}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        borderRadius: radius.card,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.blush,
    },
    web: { flex: 1, backgroundColor: colors.blush },
});