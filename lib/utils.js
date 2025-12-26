function w(val, width) {
  if (val == null) return width;
  return width * val;
}

function h(val, height) {
  if (val == null) return height;
  return height * val;
}

function makeCircle(numSides, radius) {
  const points = [];
  const radiansPerStep = (Math.PI * 2) / numSides;

  for (let theta = 0; theta < Math.PI * 2; theta += radiansPerStep) {
    const x = 0.5 + radius * Math.cos(theta);
    const y = 0.5 + radius * Math.sin(theta);
    points.push([x, y]);
  }

  return points;
}

function distortPolygon(polygon) {
  return polygon.map((point) => {
    const x = point[0];
    const y = point[1];
    const distance = dist(0.5, 0.5, x, y);

    //two different z to animate
    const z = frameCount / 500;
    const z2 = frameCount / 200;

    //noise function
    const noiseFn = (x, y) => {
      const noiseX = (x + 0.31) * distance * 2 + z2;
      const noiseY = (y - 1.73) * distance * 2 + z2;
      return noise(noiseX, noiseY, z);
    };

    //direction of distortion
    const theta = noiseFn(x, y) * PI * 3;


    const amountToNudge = 0.08 - cos(z) * 0.08;
    const newX = x + amountToNudge * cos(theta);
    const newY = y + amountToNudge * sin(theta);

    return [newX, newY];
  });
}

//making it smoother
function chaikin(arr, num) {
  if (num === 0) return arr;
  const l = arr.length;
  const smooth = arr
    .map((c, i) => {
      return [
        [
          0.75 * c[0] + 0.25 * arr[(i + 1) % l][0],
          0.75 * c[1] + 0.25 * arr[(i + 1) % l][1],
        ],
        [
          0.25 * c[0] + 0.75 * arr[(i + 1) % l][0],
          0.25 * c[1] + 0.75 * arr[(i + 1) % l][1],
        ],
      ];
    })
    .flat();
  return num === 1 ? smooth : chaikin(smooth, num - 1);
}

function saveHDFrame() {
  const currentSize = width;
  const hdSize = 2400;
  resizeCanvas(hdSize, hdSize);
  redraw();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  save(`noise-orbit-hd-${timestamp}.png`);

  setTimeout(() => {
    resizeCanvas(currentSize, currentSize);
  }, 100);
}