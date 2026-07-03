const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withDesugaring(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      
      if (!buildGradle.includes('coreLibraryDesugaringEnabled')) {
        buildGradle = buildGradle.replace(
          /android\s*\{/,
          'android {\n    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }'
        );
      }
      
      if (!buildGradle.includes('desugar_jdk_libs')) {
        buildGradle = buildGradle.replace(
          /dependencies\s*\{/,
          'dependencies {\n    coreLibraryDesugaring "com.android.tools:desugar_jdk_libs_nio:2.1.4"'
        );
      }
      
      config.modResults.contents = buildGradle;
    }
    return config;
  });
};
