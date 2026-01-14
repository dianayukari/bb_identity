let canvas;
let recorder;
let recording = false;
let recordedChunks = [];


let dataPoints = [];
let hoverData = null;

async function preload() {
  dataPoints = await loadData();
}

function setup() {
  const size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9);
  canvas = createCanvas(size, size);
  canvas.parent("container");
  colorMode(HSB, 360, 100, 100, 1.0);

  setupRecording();
}

function draw() {

  //transparent bg
  // background(0, 0, 100);
  background(219, 100, 33)
  // clear();
  noFill();

  const maxData = Math.max(...dataPoints.map(d => d.data || 0), 1);

  const minRadius = 0.0001;
  const maxRadius = 0.5;

  dataPoints.forEach((point) => {
    if (point.data === 0) return;

    const normalizedData = point.data / maxData;

    //tamanho e grossura do traço é proporcional ao dado
    const radius = minRadius + normalizedData * (maxRadius - minRadius);
    const strokeThickness = map(point.data, 0, maxData, 0.0005, 0.008);
    //cor é aumento ou diminuição em relação a 2021
    const colorData = getColor(point.class);
    stroke(colorData.h, colorData.s, colorData.b);
    strokeWeight(w(strokeThickness, width));

    const circle = makeCircle(20, radius);
    const distortedCircle = distortPolygon(circle);
    const smoothCircle = chaikin(distortedCircle, 4);

    //labels
    const centerX = w(0.5, width);
    const centerY = h(0.5, height);
    const strokeWidth = strokeThickness * width;

    let isNearCircle = false;
    for(let i = 0; i<smoothCircle.length; i++) {
      const pointX = w(smoothCircle[i][0], width);
      const pointY = h(smoothCircle[i][1], height);
      const distToPoint = dist(mouseX, mouseY, pointX, pointY)

      if(distToPoint <= strokeWidth * 2) {
        isNearCircle = true;
        break;
      }
    }

    if(isNearCircle) {
      hoverData = point;
    }

    beginShape();
    smoothCircle.forEach((pt) => {
      vertex(w(pt[0], width), h(pt[1], height));
    });
    endShape(CLOSE);
  });

  //labels
  if(hoverData) {
    const labelText = `${hoverData.country_label}`;
    const labelWidth = Math.max(textWidth(labelText));
    const labelHeight = 40
    const padding = 8

    let labelX = mouseX + 10

    if(labelX + labelWidth > width) {
      labelX = mouseX - labelWidth - 10; 
    }

    let labelY = mouseY - 10

    if(labelY - labelHeight < 0) {
      labelY = mouseY + 30
    }

    fill(0, 0, 95, 0.85);
    noStroke()
    rect(labelX - padding, labelY - labelHeight + padding,
      labelWidth + padding * 2, labelHeight, 8
    )

    fill(219, 100, 33)
    noStroke()
    textAlign(LEFT)
    textSize(14)
    textFont("Inter")
    text(labelText, labelX, labelY-padding)
  }

  hoverData = null
}

function windowResized() {
  if (document.getElementById("container")) {
    const size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9);
    resizeCanvas(size, size);
  }
}


function setupRecording() {
  const startBtn = document.getElementById('startRecord');
  const stopBtn = document.getElementById("stopRecord"); 
  const downloadBtn = document.getElementById("download");

  startBtn.addEventListener('click', startRecording);
  stopBtn.addEventListener("click", stopRecording);
  downloadBtn.addEventListener("click", downloadVideo);
}

function startRecording() {
  recordedChunks = [];

  const stream = canvas.canvas.captureStream(30)

  recorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp8",
  });

  recorder.ondataavailable = (e) => {
    if(e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  recorder.onstop = () => {
    document.getElementById('download').disabled = false
  };

  recorder.start();
  recording = true;

  document.getElementById('startRecord').disabled = true;
  document.getElementById("stopRecord").disabled = false;
}

function stopRecording() {
  if(recorder && recording) {
    recorder.stop();
    recording = false;

    document.getElementById("startRecord").disabled = false;
    document.getElementById("stopRecord").disabled = true;
  }
}

function downloadVideo() {
  if(recordedChunks.length > 0) {
    const blob = new Blob(recordedChunks, {
      type: 'video/webm'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animation_${Date.now()}.webm`;
    a.click();

    URL.revokeObjectURL(url);

  }
}
