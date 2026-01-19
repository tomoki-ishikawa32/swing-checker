import {
  FilesetResolver,
  PoseLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";

const cam = document.getElementById("cam");

// ---- WebRTC ----
const pc = new RTCPeerConnection();
const dc = pc.createDataChannel("events");

// 映像ビットレート制限（通信量削減）
pc.onicecandidate = e => {
  if (e.candidate) {
    // ← ここで candidate を iPad に送る
  }
};

// ---- カメラ取得 ----
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: 640,
    height: 360,
    frameRate: 24,
    facingMode: "user"
  },
  audio: false
});

cam.srcObject = stream;
await cam.play();

stream.getTracks().forEach(track => pc.addTrack(track, stream));

// ---- Pose 初期化 ----
const vision = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
);

const pose = await PoseLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      "https://tomoki-ishikawa32.github.io/iPhone_pose_test/models/pose_landmarker_lite.task"
  },
  runningMode: "VIDEO",
  numPoses: 1
});

// ---- スイング検知（右手首速度）----
let lastWrist = null;
let lastT = 0;
let cooldownUntil = 0;

function detectSwing(landmarks, t) {
  if (t < cooldownUntil) return;

  const w = landmarks[16]; // RIGHT_WRIST
  if (!w || !lastWrist) {
    lastWrist = w;
    lastT = t;
    return;
  }

  const dx = w.x - lastWrist.x;
  const dy = w.y - lastWrist.y;
  const dt = (t - lastT) / 1000;
  const speed = Math.sqrt(dx*dx + dy*dy) / Math.max(dt, 1e-3);

  if (speed > 0.02) {
    cooldownUntil = t + 1500;
    sendSwing(t / 1000); // 秒で送る
  }

  lastWrist = w;
  lastT = t;
}

function sendSwing(t0) {
  if (dc.readyState === "open") {
    dc.send(JSON.stringify({ type: "swing", t0 }));
    console.log("send swing", t0.toFixed(2));
  }
}

// ---- 推定ループ ----
function loop() {
  const t = performance.now();
  const res = pose.detectForVideo(cam, t);
  if (res.landmarks?.length) {
    detectSwing(res.landmarks[0], t);
  }
  requestAnimationFrame(loop);
}
loop();
