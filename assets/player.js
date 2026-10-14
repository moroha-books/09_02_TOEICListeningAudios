(function () {
  var tracks = window.TRACKS || [];
  var audio = document.getElementById("audio");
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".track"));
  var playBtn = document.getElementById("play");
  var seek = document.getElementById("seek");
  var timeEl = document.getElementById("time");
  var labelEl = document.getElementById("now-label");
  var speed = document.getElementById("speed");
  var slow = document.getElementById("slow");
  var auto = document.getElementById("auto");
  var repeat = document.getElementById("repeat");
  var current = -1;
  var seeking = false;

  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  var savedSpeed = load("toeic-speed");
  if (savedSpeed) speed.value = savedSpeed;
  if (slow && load("toeic-slow") === "1") slow.checked = true;

  function fmt(s) {
    if (!isFinite(s)) return "0:00";
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function srcFor(t) {
    return slow && slow.checked && t.slow ? t.slow : t.normal;
  }

  function select(i) {
    if (i < 0 || i >= tracks.length) return;
    current = i;
    audio.src = srcFor(tracks[i]);
    audio.playbackRate = parseFloat(speed.value);
    audio.play();
    labelEl.textContent = tracks[i].label;
    buttons.forEach(function (b, j) { b.classList.toggle("playing", j === i); });
    buttons[i].scrollIntoView({ block: "nearest" });
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () { select(parseInt(b.dataset.index, 10)); });
  });

  playBtn.addEventListener("click", function () {
    if (current < 0) { select(0); return; }
    if (audio.paused) audio.play(); else audio.pause();
  });
  document.getElementById("prev").addEventListener("click", function () { select(Math.max(0, current - 1)); });
  document.getElementById("next").addEventListener("click", function () { select(current + 1); });
  document.getElementById("back5").addEventListener("click", function () { audio.currentTime = Math.max(0, audio.currentTime - 5); });
  document.getElementById("fwd5").addEventListener("click", function () { audio.currentTime += 5; });

  speed.addEventListener("change", function () {
    audio.playbackRate = parseFloat(speed.value);
    store("toeic-speed", speed.value);
  });
  if (slow) {
    slow.addEventListener("change", function () {
      store("toeic-slow", slow.checked ? "1" : "0");
      if (current >= 0) {
        var ratio = audio.duration ? audio.currentTime / audio.duration : 0;
        var wasPlaying = !audio.paused;
        select(current);
        if (!wasPlaying) audio.pause();
        audio.addEventListener("loadedmetadata", function once() {
          audio.currentTime = ratio * audio.duration;
          audio.removeEventListener("loadedmetadata", once);
        });
      }
    });
  }

  audio.addEventListener("play", function () { playBtn.innerHTML = "&#10074;&#10074;"; playBtn.setAttribute("aria-label", "一時停止"); });
  audio.addEventListener("pause", function () { playBtn.innerHTML = "&#9654;"; playBtn.setAttribute("aria-label", "再生"); });
  audio.addEventListener("timeupdate", function () {
    if (!seeking && audio.duration) seek.value = (audio.currentTime / audio.duration) * 100;
    timeEl.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration);
  });
  audio.addEventListener("ended", function () {
    if (repeat.checked) { select(current); return; }
    if (auto.checked && current + 1 < tracks.length) select(current + 1);
  });

  seek.addEventListener("input", function () { seeking = true; });
  seek.addEventListener("change", function () {
    if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
    seeking = false;
  });
})();
