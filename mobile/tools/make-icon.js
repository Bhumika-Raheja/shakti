// Draws the Shakti app icon (a shield with a heart) as square PNG pictures.
// Run once with:  node tools/make-icon.js
const sharp = require("sharp");

const ROSE = "#D81B60";

// The shield and the heart, drawn on a 1024 x 1024 canvas
function drawing(withBackground, scale) {
    const background = withBackground ? '<rect width="1024" height="1024" fill="#FFFFFF"/>' : "";
    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${background}
    <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
      <path d="M512 140 L832 250 V520 C832 700 700 830 512 900 C324 830 192 700 192 520 V250 Z" fill="${ROSE}"/>
      <path d="M512 140 L832 250 V520 C832 700 700 830 512 900 C324 830 192 700 192 520 V250 Z"
            fill="#FFFFFF" transform="translate(512 520) scale(0.62) translate(-512 -520)"/>
      <path d="M512 640 C400 560 360 500 360 440 C360 390 400 360 440 360 C475 360 500 380 512 405
               C524 380 549 360 584 360 C624 360 664 390 664 440 C664 500 624 560 512 640 Z" fill="${ROSE}"/>
    </g>
  </svg>`;
}

async function main() {
    // The main icon: white background, the logo fills most of it
    await sharp(Buffer.from(drawing(true, 1))).png().toFile("assets/images/icon.png");

    // The Android "adaptive" icon: see-through background, the logo a bit smaller
    // (Android crops the edges, so the logo needs room around it)
    await sharp(Buffer.from(drawing(false, 0.85)))
        .png()
        .toFile("assets/images/adaptive-icon-foreground.png");

    console.log("Done: icon.png and adaptive-icon-foreground.png (both 1024 x 1024)");
}

main().catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
});