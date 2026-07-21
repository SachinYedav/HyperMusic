const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withNotificationIcon = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const iconPath = path.join(config.modRequest.projectRoot, 'assets', 'notification-icon.png');
      const resDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'drawable');
      
      if (!fs.existsSync(resDir)) {
        fs.mkdirSync(resDir, { recursive: true });
      }

      const destPath = path.join(resDir, 'media3_notification_small_icon.png');
      
      if (fs.existsSync(iconPath)) {
        fs.copyFileSync(iconPath, destPath);
      } else {
        console.warn(`[withNotificationIcon] Source icon not found at: ${iconPath}`);
      }

      return config;
    },
  ]);

  // Inject meta-data into AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    if (mainApplication) {
      if (!mainApplication['meta-data']) {
        mainApplication['meta-data'] = [];
      }
      
      const hasNotificationIcon = mainApplication['meta-data'].some(
        (meta) => meta.$['android:name'] === 'com.google.firebase.messaging.default_notification_icon'
      );
      
      if (!hasNotificationIcon) {
        mainApplication['meta-data'].push({
          $: {
            'android:name': 'com.google.firebase.messaging.default_notification_icon',
            'android:resource': '@drawable/notification_icon',
          },
        });
      }
    }
    return config;
  });

  return config;
};

module.exports = withNotificationIcon;
