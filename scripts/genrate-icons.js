const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS_DIR = path.join(__dirname, '../assets');

const COLOR_CRIMSON = '#DC143C';
const BRAND_BLACK = '#000000';
const BRAND_WHITE = '#FFFFFF';

const getSvg = (color, strokeWidth = 2.5) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2a10 10 0 1 1-10 10"/>
  <circle cx="12" cy="12" r="6"/>
  <path d="M10.5 9.5 15 12l-4.5 2.5v-5z" fill="${color}" stroke="none"/>
</svg>`;

async function generateIcons() {
    console.log('Generating premium crimson HyperMusic icons...');

    if (!fs.existsSync(ASSETS_DIR)) {
        fs.mkdirSync(ASSETS_DIR, { recursive: true });
    }

    // 1. App Icon (1024x1024) - True Black Background with Vibrant Crimson Icon
    const iconSvg = getSvg(COLOR_CRIMSON, 2.5).replace('width="1024" height="1024"', 'width="600" height="600"');
    await sharp({
        create: { width: 1024, height: 1024, channels: 4, background: BRAND_BLACK }
    })
        .composite([{ input: Buffer.from(iconSvg), gravity: 'center' }])
        .png()
        .toFile(path.join(ASSETS_DIR, 'icon.png'));
    console.log('✅ Created icon.png (App Icon - Crimson)');

    // 2. Splash Icon (1280x1280) - Transparent Background with Crimson Icon
    const splashSvg = getSvg(COLOR_CRIMSON, 2.5).replace('width="1024" height="1024"', 'width="1280" height="1280"');
    await sharp(Buffer.from(splashSvg))
        .png()
        .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));
    console.log('✅ Created splash-icon.png (Splash Screen - 1280x1280)');

    // 3. Android Adaptive Foreground (1080x1080) - Transparent with Crimson Icon, padded
    const adaptiveForegroundSvg = getSvg(COLOR_CRIMSON, 2.5).replace('width="1024" height="1024"', 'width="600" height="600"');
    await sharp({
        create: { width: 1080, height: 1080, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
        .composite([{ input: Buffer.from(adaptiveForegroundSvg), gravity: 'center' }])
        .png()
        .toFile(path.join(ASSETS_DIR, 'android-icon-foreground.png'));
    console.log('✅ Created android-icon-foreground.png');

    // 4. Android Adaptive Background (1080x1080) - Solid True Black
    await sharp({
        create: { width: 1080, height: 1080, channels: 4, background: BRAND_BLACK }
    })
        .png()
        .toFile(path.join(ASSETS_DIR, 'android-icon-background.png'));
    console.log('✅ Created android-icon-background.png');

    // 5. Android Adaptive Monochrome (1080x1080) - Solid White Icon for Android 13+
    const monochromeSvg = getSvg(BRAND_WHITE, 2.5).replace('width="1024" height="1024"', 'width="600" height="600"');
    await sharp({
        create: { width: 1080, height: 1080, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
        .composite([{ input: Buffer.from(monochromeSvg), gravity: 'center' }])
        .png()
        .toFile(path.join(ASSETS_DIR, 'android-icon-monochrome.png'));
    console.log('✅ Created android-icon-monochrome.png (Pure White for Android 13+)');

    // 6. Notification Icon (96x96) - Transparent with Solid White Icon
    const notificationSvg = getSvg(BRAND_WHITE, 2.5).replace('width="1024" height="1024"', 'width="96" height="96"');
    await sharp({
        create: { width: 96, height: 96, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
        .composite([{ input: Buffer.from(notificationSvg), gravity: 'center' }])
        .png()
        .toFile(path.join(ASSETS_DIR, 'notification-icon.png'));
    console.log('✅ Created notification-icon.png (Android Status Bar)');

    // 7. Default Artwork (1024x1024) - Pristine Dark Surface with Crimson Music Note 
    const defaultArtworkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 24 24" fill="none" stroke="${COLOR_CRIMSON}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" stroke="#333333" stroke-width="1"/>
      <path d="M9 18V5l12-2v13" stroke="${COLOR_CRIMSON}" stroke-width="2"/>
      <circle cx="6" cy="18" r="3" fill="${COLOR_CRIMSON}" stroke="none"/>
      <circle cx="18" cy="16" r="3" fill="${COLOR_CRIMSON}" stroke="none"/>
    </svg>`;
    await sharp({
        create: { width: 1024, height: 1024, channels: 4, background: '#121212' }
    })
        .composite([{ input: Buffer.from(defaultArtworkSvg), gravity: 'center' }])
        .png()
        .toFile(path.join(ASSETS_DIR, 'default-artwork.png'));
    console.log('✅ Created default-artwork.png (AAPT2 Compliant Fallback Artwork)');

    console.log('\n🎉 Premium HyperMusic icons generated successfully!');
}

generateIcons().catch(console.error);
