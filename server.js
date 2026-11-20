const http = require("http");
const fs = require("fs");
const path = require("path");

// Load .env helper (re-reads on request so key/model edits take effect immediately)
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (m) {
          process.env[m[1]] = (m[2] || "").replace(/^['"]|['"]$/g, "");
        }
      });
  }
}
loadEnv();

const AURA_PROMPTS = {
  "magenta-retro-haze": `Transform the uploaded or live-captured photo into a dreamy, hazy retro portrait while preserving the person’s identity, facial features, hairstyle, expression, pose, and clothing.

Frame the subject from the chest up, centered and facing the camera, against a dark background. Add a large, soft-focus magenta and hot-pink glow that fills most of the upper background and spills gently over the portrait. Blend in a subtle violet haze around the face and shoulders, with a warm pale-yellow glow near the lower right edge. Keep the face softly illuminated and recognizable, with natural skin texture and visible details.

Give the image a vintage analog photo-booth finish: gentle blur, soft light bloom, muted contrast, and fine film grain. Keep the color lighting atmospheric without hiding the person’s features. No text, logos, extra people, or changes to the subject’s identity.`,

  "vintage-magenta-coral": `Transform the uploaded or live-captured photo into a dreamy, vintage color portrait while preserving the person’s identity, facial features, hairstyle, expression, and pose.

Frame the subject from the chest up, centered and facing the camera, against a nearly black background. Keep the face softly lit and recognizable. Create a large, diffused halo of colored light around the subject: pink and magenta across the upper left and center, warm coral and orange across the upper right, soft violet along the lower left, and bright golden yellow on the lower right. Add a hint of cyan near the bottom edge. Let the light bloom softly over the hair and shoulders, while keeping the facial features clear.

Use a hazy analog photo-booth look with gentle softness, subtle film grain, and slightly faded color. Preserve the original clothing and accessories. No text, logos, extra people, or changes to the subject’s identity.`,

  "cobalt-violet-vintage": `Transform the uploaded or live-captured photo into a dreamy, vintage portrait while preserving the person’s identity, facial features, hairstyle, expression, and pose.

Frame the subject from the chest up, centered and smiling naturally at the camera, against a nearly black background. Keep the face recognizable and softly illuminated. Add a broad, diffused halo of colored light: deep cobalt blue across the upper left and left side, blending into violet and magenta across the upper right and around the subject. Let the blue-violet glow softly wash over the hair, face, and shoulders without obscuring facial details.

Use a moody analog photo-booth aesthetic with gentle softness, subtle film grain, and a slightly faded photographic finish. Preserve the subject’s original clothing and accessories. No text, logos, extra people, or changes to the subject’s identity`,

  "retro-color-light": `Transform the uploaded or live-captured photo into a dreamy, retro color-light portrait while preserving the person’s identity, facial features, hairstyle, expression, and pose.

Keep the subject centered and facing the camera, framed from the chest up against a dark, nearly black background. Preserve the original clothing and accessories. Add soft, overlapping washes of colored light around the subject: deep red and hot pink across the upper left, violet and electric blue across the upper right, and a warm golden-yellow glow along the lower right. Let the colored light spill gently across the hair and shoulders while keeping the face clearly visible and recognizable.

Use a soft-focus, analog photo-booth look with subtle film grain, gentle color bloom, and a slightly faded finish. Keep the lighting atmospheric and flattering, with natural skin texture. No text, logos, extra people, or changes to the subject’s identity`,

  "cobalt-emerald-bloom": `Transform the uploaded or live-captured photo into a softly glowing, retro color-portrait while preserving the person’s identity, facial features, hairstyle, expression, and pose.

Frame the subject from the chest up, centered and facing the camera, against a nearly black background. Keep the face natural, softly illuminated, and clearly visible. Add broad, blurred colored light around the subject: vivid cobalt blue across the upper background, teal and green behind the head and shoulders, violet and magenta blooming from the lower left, and a subtle red glow near the lower right. Blend the colors smoothly like out-of-focus studio lights, with gentle film grain and a slightly soft, vintage photo-booth finish.

Keep the subject’s original clothing and accessories. Make the result atmospheric but flattering and realistic. No text, logos, extra people, or changes to the person’s identity.`,

  "amber-magenta-halo": `Transform the uploaded or live-captured photo into a cinematic, photorealistic portrait while preserving the person’s identity, facial features, hairstyle, expression, and pose.

Frame the subject from the chest up, centered and facing the camera, against a nearly black background. Add a soft, dramatic halo of warm amber and burnt-orange light above and behind the head, blending into deep magenta and violet around the face and shoulders, with a faint teal shadow near the lower edges. Keep the face softly illuminated and clearly recognizable, with natural skin texture, subtle shadows, and realistic detail. Use a dark outfit and restrained styling; preserve the subject’s original clothing unless it conflicts with the moody look.

Create a mysterious, atmospheric, low-key photographic effect with gentle color bloom, soft focus in the background, and subtle film grain. Keep the image elegant and realistic—no fantasy elements, no extra people, no text, no logos, and no changes to the subject’s identity.`
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg"
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && req.url.startsWith("/api/config")) {
    loadEnv();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        cloudinaryCloudName: (process.env.VITE_CLOUDINARY_CLOUD_NAME || "dzz5belph").trim(),
        cloudinaryUploadPreset: (process.env.VITE_CLOUDINARY_UPLOAD_PRESET || "rishi123").trim(),
        cloudinaryFolder: (process.env.VITE_CLOUDINARY_FOLDER || "RUPAY").trim()
      })
    );
  }

  if (req.method === "POST" && req.url === "/api/generate-aura") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) req.destroy();
    });
    req.on("end", async () => {
      try {
        loadEnv();
        const { imageBase64, auraId, apiKey, briaApiKey } = JSON.parse(body || "{}");
        const key = (apiKey || process.env.VITE_IMAGE_API_KEY || process.env.OPENAI_API_KEY || "").trim();
        const briaKey = (briaApiKey || process.env.BRIA_API_KEY || process.env.VITE_BRIA_API_KEY || "").trim();
        const briaUrl = (process.env.BRIA_API_URL || "https://engine.prod.bria-api.com/v1/background/remove").trim();
        const apiUrl = (process.env.VITE_IMAGE_API_URL || "https://api.openai.com/v1/images/edits").trim();
        const preferredModel = (process.env.VITE_IMAGE_MODEL || "gpt-image-2.5-flare").trim();

        const base64Data = (imageBase64 || "").replace(/^data:image\/\w+;base64,/, "");
        const imgBuffer = Buffer.from(base64Data, "base64");

        // Step 1: Bria AI Background Removal (when BRIA_API_KEY is configured)
        let cutoutDataUrl = null;
        if (briaKey) {
          const briaForm = new FormData();
          briaForm.append("file", new Blob([imgBuffer], { type: "image/png" }), "capture.png");
          const briaRes = await fetch(briaUrl, {
            method: "POST",
            headers: { api_token: briaKey },
            body: briaForm
          });
          const briaJson = await briaRes.json();
          if (!briaRes.ok) {
            res.writeHead(briaRes.status, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: briaJson?.error?.message || briaJson?.message || "Bria AI BG removal error" }));
          }
          if (briaJson?.result_url) {
            const imgRes = await fetch(briaJson.result_url);
            const arrBuf = await imgRes.arrayBuffer();
            cutoutDataUrl = `data:image/png;base64,${Buffer.from(arrBuf).toString("base64")}`;
          }
        }

        if (cutoutDataUrl) {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ cutoutDataUrl, imageDataUrl: cutoutDataUrl }));
        }

        if (!key) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Missing Bria AI or OpenAI API key" }));
        }
        const prompt = AURA_PROMPTS[auraId] || AURA_PROMPTS["retro-color-light"];

        async function callEdit(modelName) {
          const form = new FormData();
          form.append("model", modelName);
          form.append("prompt", prompt);
          form.append("size", "1024x1536");
          form.append("quality", "low");
          form.append("image", new Blob([imgBuffer], { type: "image/png" }), "capture.png");
          return fetch(apiUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}` },
            body: form
          });
        }

        let oaRes = await callEdit(preferredModel);
        let oaJson = await oaRes.json();
        if (!oaRes.ok && preferredModel !== "gpt-image-2.5-flare") {
          oaRes = await callEdit("gpt-image-2.5-flare");
          oaJson = await oaRes.json();
        }

        if (!oaRes.ok) {
          res.writeHead(oaRes.status, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: oaJson?.error?.message || "OpenAI API error" }));
        }

        const outB64 = oaJson?.data?.[0]?.b64_json;
        const outUrl = oaJson?.data?.[0]?.url;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            imageDataUrl: outB64 ? `data:image/png;base64,${outB64}` : outUrl,
            prompt
          })
        );
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message || "Server error" }));
      }
    });
    return;
  }

  const cleanUrl = req.url.split("?")[0];
  const relPath = cleanUrl === "/" ? "index.html" : cleanUrl.replace(/^\/+/, "");
  const filePath = path.resolve(__dirname, relPath);
  if (!filePath.startsWith(path.resolve(__dirname))) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

const PORT = Number(process.env.PORT) || 3000;
server.once("error", (err) => {
  if (err.code === "EADDRINUSE") {
    server.listen(3001, "0.0.0.0", () => {
      console.log("RuPay Aura Booth API & server running at http://localhost:3001");
    });
  }
});
server.listen(PORT, "0.0.0.0", () => {
  console.log(`RuPay Aura Booth server running at http://localhost:${PORT}`);
});
