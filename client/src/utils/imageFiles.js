export async function createImageSignature(imageDataUrl) {
  const image = await loadImage(imageDataUrl);
  const canvas = document.createElement("canvas");
  const size = 16;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);

  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  const colorGrid = [];

  for (let index = 0; index < data.length; index += 4) {
    const pixelRed = data[index];
    const pixelGreen = data[index + 1];
    const pixelBlue = data[index + 2];

    red += pixelRed;
    green += pixelGreen;
    blue += pixelBlue;
    colorGrid.push(quantizeColor(pixelRed), quantizeColor(pixelGreen), quantizeColor(pixelBlue));
    count += 1;
  }

  return {
    averageColor: {
      r: Math.round(red / count),
      g: Math.round(green / count),
      b: Math.round(blue / count)
    },
    colorGrid
  };
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function quantizeColor(value) {
  return Math.min(7, Math.floor(value / 32));
}
