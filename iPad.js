const live = document.getElementById("live");
const loop = document.getElementById("loop");

// ---- WebRTC ----
const pc = new RTCPeerConnection();
let dc = null;

pc.ontrack = e => {
  live.srcObject = e.streams[0];
  loop.srcObject = e.streams[0];
};

pc.ondatachannel = e => {
  dc = e.channel;
  dc.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.type === "swing") {
      onSwing(msg.t0);
    }
  };
};

// pc.onicecandidate = e => { iPhoneへ送信 }

// ---- リングバッファ設定 ----
const PRE = 2.0;
const POST = 2.0;

let looping = false;
let loopStart = 0;
let loopEnd = 0;

// ---- スイング受信 ----
function onSwing(t0) {
  loopStart = Math.max(t0 - PRE, 0);
  loopEnd = t0 + POST;

  looping = true;
  loop.currentTime = loopStart;
  loop.play();

  console.log("loop", loopStart.toFixed(2), loopEnd.toFixed(2));
}

// ---- ループ制御 ----
function controlLoop() {
  if (looping && loop.currentTime >= loopEnd) {
    loop.currentTime = loopStart;
    loop.play();
  }
  requestAnimationFrame(controlLoop);
}
controlLoop();
