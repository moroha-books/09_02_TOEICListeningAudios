(function () {
  var chapters = window.COMMUTE || [];
  var bookTitle = window.BOOK_TITLE || "";
  var audio = document.getElementById("audio");
  var playBtn = document.getElementById("play");
  var seek = document.getElementById("seek");
  var timeEl = document.getElementById("time");
  var titleEl = document.getElementById("now-title");
  var setEl = document.getElementById("now-set");
  var speed = document.getElementById("speed");
  var autoNext = document.getElementById("auto-next");
  var setList = document.getElementById("set-list");
  var setHead = document.getElementById("set-head");
  var cards = Array.prototype.slice.call(document.querySelectorAll(".chapter-card"));
  var current = -1;
  var seeking = false;
  var lastSave = 0;

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function posKey(i) { return "commute-pos-" + chapters[i].id; }

  function fmt(s) {
    if (!isFinite(s)) return "0:00";
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  var savedSpeed = load("commute-speed");
  if (savedSpeed) speed.value = savedSpeed;
  if (load("commute-auto") === "0") autoNext.checked = false;

  function showProgress() {
    cards.forEach(function (card, i) {
      var pos = parseFloat(load(posKey(i)) || "0");
      var total = chapters[i].minutes * 60;
      var el = card.querySelector(".progress");
      if (pos > 5 && total) {
        el.textContent = "前回 " + fmt(pos) + " まで";
      } else {
        el.textContent = "";
      }
    });
  }

  function currentSetIndex() {
    if (current < 0) return -1;
    var m = chapters[current].markers, t = audio.currentTime, idx = -1;
    for (var i = 0; i < m.length; i++) { if (m[i].t <= t + 0.5) idx = i; }
    return idx;
  }

  function renderSets() {
    var ch = chapters[current];
    setHead.textContent = ch.id + " " + ch.title + " のセット一覧";
    setList.innerHTML = "";
    ch.markers.forEach(function (m, i) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "set-item";
      b.innerHTML = '<span class="set-label"></span><span class="set-sum"></span>';
      b.querySelector(".set-label").textContent = m.label;
      b.querySelector(".set-sum").textContent = m.summary;
      b.addEventListener("click", function () { audio.currentTime = m.t; audio.play(); });
      li.appendChild(b);
      setList.appendChild(li);
    });
  }

  function highlight() {
    var idx = currentSetIndex();
    Array.prototype.forEach.call(setList.querySelectorAll(".set-item"), function (b, i) {
      b.classList.toggle("playing", i === idx);
    });
    setEl.textContent = idx >= 0 ? chapters[current].markers[idx].label : "";
  }

  function select(i, autoplay) {
    if (i < 0 || i >= chapters.length) return;
    current = i;
    var ch = chapters[i];
    audio.src = ch.src;
    audio.playbackRate = parseFloat(speed.value);
    var resume = parseFloat(load(posKey(i)) || "0");
    audio.addEventListener("loadedmetadata", function once() {
      if (resume > 5 && resume < audio.duration - 5) audio.currentTime = resume;
      audio.playbackRate = parseFloat(speed.value);
      audio.removeEventListener("loadedmetadata", once);
    });
    if (autoplay !== false) audio.play();
    titleEl.textContent = ch.id + " " + ch.title;
    cards.forEach(function (c, j) { c.classList.toggle("playing", j === i); });
    store("commute-last", String(i));
    renderSets();
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: ch.id + " " + ch.title, artist: "通勤リスニング", album: bookTitle
      });
    }
  }

  cards.forEach(function (c, i) { c.addEventListener("click", function () { select(i); }); });
  playBtn.addEventListener("click", function () {
    if (current < 0) { var last = parseInt(load("commute-last") || "0", 10); select(isNaN(last) ? 0 : last); return; }
    if (audio.paused) audio.play(); else audio.pause();
  });
  document.getElementById("back10").addEventListener("click", function () { audio.currentTime = Math.max(0, audio.currentTime - 10); });
  document.getElementById("fwd30").addEventListener("click", function () { audio.currentTime += 30; });
  document.getElementById("prev").addEventListener("click", function () { select(Math.max(0, current - 1)); });
  document.getElementById("next").addEventListener("click", function () { select(current + 1); });
  speed.addEventListener("change", function () { audio.playbackRate = parseFloat(speed.value); store("commute-speed", speed.value); });
  autoNext.addEventListener("change", function () { store("commute-auto", autoNext.checked ? "1" : "0"); });

  audio.addEventListener("play", function () { playBtn.innerHTML = "&#10074;&#10074;"; playBtn.setAttribute("aria-label", "一時停止"); });
  audio.addEventListener("pause", function () {
    playBtn.innerHTML = "&#9654;"; playBtn.setAttribute("aria-label", "再生");
    if (current >= 0) store(posKey(current), String(audio.currentTime));
    showProgress();
  });
  audio.addEventListener("timeupdate", function () {
    if (!seeking && audio.duration) seek.value = (audio.currentTime / audio.duration) * 100;
    timeEl.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration);
    if (current >= 0 && Date.now() - lastSave > 5000) {
      store(posKey(current), String(audio.currentTime));
      lastSave = Date.now();
    }
    highlight();
  });
  audio.addEventListener("ended", function () {
    store(posKey(current), "0");
    showProgress();
    if (autoNext.checked && current + 1 < chapters.length) select(current + 1);
  });
  seek.addEventListener("input", function () { seeking = true; });
  seek.addEventListener("change", function () {
    if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
    seeking = false;
  });

  if ("mediaSession" in navigator) {
    var ms = navigator.mediaSession;
    try {
      ms.setActionHandler("play", function () { audio.play(); });
      ms.setActionHandler("pause", function () { audio.pause(); });
      ms.setActionHandler("seekbackward", function () { audio.currentTime = Math.max(0, audio.currentTime - 10); });
      ms.setActionHandler("seekforward", function () { audio.currentTime += 30; });
      ms.setActionHandler("previoustrack", function () { select(Math.max(0, current - 1)); });
      ms.setActionHandler("nexttrack", function () { select(current + 1); });
    } catch (e) {}
  }

  showProgress();
})();
