function main() {
  const canvas = window.document.getElementById("luna");

  if (canvas === null) {
    throw new Error('No HTML element found with id "luna"');
  }

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('No Canvas element found with id "luna"');
  }

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Failed to get context from canvas");
  }

  const start = Date.now();
  let elapsedTime = 0;
  let frames: number[] = [];

  setInterval(() => {
    const now = Date.now();

    frames.push(now);
    frames = frames.filter((value) => now - value < 1_000);

    elapsedTime = now - start;

    context.clearRect(0, 0, 960, 540);

    const SPEED = 0.2;
    const x = ((elapsedTime * SPEED) % (960 + 200)) - 100;
    const y = Math.sin(elapsedTime * 0.001) * 100 + 200;

    context.fillStyle = "blue";
    context.beginPath();
    context.arc(x, y, 50, 0, 2 * Math.PI);
    context.fill();

    context.fillStyle = "white";
    context.font = "30px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${frames.length} FPS`, x, y);
  }, 0);
}

window.onload = main;
