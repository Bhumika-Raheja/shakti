import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { colors, radius } from "../constants/theme";

export type MapHelper = {
    id: string;
    initial: string;
    lat: number;
    lng: number;
    lead: boolean;
};

type Point = { lat: number; lng: number };

// The map is a small web page (Leaflet) shown inside the app.
// The app sends it the latest positions, and it redraws the dots.
const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #FFF0F4; }
  .pin { width: 28px; height: 28px; border-radius: 50%; border: 3px solid #fff;
         box-shadow: 0 1px 4px rgba(0,0,0,0.35); color: #fff; font: 700 13px sans-serif;
         display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
  .me { background: #B71C1C; }
  .lead { background: #D81B60; }
  .helper { background: #F06292; }
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

  // Builds a round dot with a letter inside (textContent keeps names safe)
  function pin(cls, text) {
    var el = document.createElement('div');
    el.className = 'pin ' + cls;
    el.textContent = text;
    return L.divIcon({ html: el, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
  }

  window.update = function (d) {
    layer.clearLayers();
    var points = [];
    if (d.me) {
      L.marker([d.me.lat, d.me.lng], { icon: pin('me', '') }).addTo(layer);
      points.push([d.me.lat, d.me.lng]);
    }
    (d.helpers || []).forEach(function (h) {
      L.marker([h.lat, h.lng], { icon: pin(h.lead ? 'lead' : 'helper', h.initial) }).addTo(layer);
      points.push([h.lat, h.lng]);
      if (d.me) {
        // A straight dashed line (not a road route)
        L.polyline([[h.lat, h.lng], [d.me.lat, d.me.lng]],
          { color: '#D81B60', weight: 3, dashArray: '6 8' }).addTo(layer);
      }
    });
    if (points.length === 1) map.setView(points[0], 16);
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 17 });
  };
</script>
</body>
</html>`;

export default function LiveMap({
    me,
    helpers,
    height = 300,
}: {
    me: Point | null;
    helpers: MapHelper[];
    height?: number;
}) {
    const ref = useRef<WebView>(null);
    const [ready, setReady] = useState(false);

    // Every time the positions change, send them to the map page
    useEffect(() => {
        if (!ready) return;
        const data = JSON.stringify({ me, helpers });
        ref.current?.injectJavaScript(
            `if (window.update) { window.update(${data}); } true;`
        );
    }, [ready, me, helpers]);

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