const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const toIco = require('png-to-ico').default;

const SRC = path.join(__dirname, '..', 'build', 'icon.svg');
const BUILD = path.join(__dirname, '..', 'build');
const svg = fs.readFileSync(SRC);

const SIZES = [16, 24, 32, 48, 64, 128, 256];

(async () => {
  const pngBuffers = [];
  for (const size of SIZES) {
    const buf = await sharp(svg).resize(size, size).png().toBuffer();
    pngBuffers.push(buf);
    if (size === 256) {
      fs.writeFileSync(path.join(BUILD, 'icon.png'), buf);
      console.log('Wrote build/icon.png (256x256)');
    }
  }
  const icoBuffer = await toIco(pngBuffers);
  fs.writeFileSync(path.join(BUILD, 'icon.ico'), icoBuffer);
  console.log('Wrote build/icon.ico');
})();
