const sharp = require('sharp');
const fs = require('fs');

async function resize() {
  try {
    const inputPath = 'C:\\Users\\kakam\\.gemini\\antigravity-ide\\brain\\1a381cd2-188a-4137-8b5a-273c42b00b7f\\media__1784859695303.png';
    const outputPath = 'c:\\Users\\kakam\\antigravity\\HUBMaisaFront\\public\\favicon.png';
    
    await sharp(inputPath)
      .resize({
        width: 512,
        height: 512,
        fit: sharp.fit.contain,
        background: { r: 255, g: 255, b: 255, alpha: 0 } // transparent background
      })
      .toFile(outputPath);
      
    console.log("Image resized successfully to 512x512 with transparent padding.");
  } catch (error) {
    console.error("Error resizing image:", error);
  }
}

resize();
