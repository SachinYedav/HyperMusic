# Third-Party Notices

HyperMusic includes third-party open-source software. Each third-party component remains governed by its own license terms.

## GPL-3.0 Component

Android builds of HyperMusic include NewPipe Extractor:

- Package: `com.github.TeamNewPipe:NewPipeExtractor:v0.26.3`
- Repository: https://github.com/TeamNewPipe/NewPipeExtractor
- License: GPL-3.0

If you redistribute a built HyperMusic binary that includes NewPipe Extractor, you are responsible for complying with GPL-3.0 obligations, including preserving notices and providing the corresponding source required by that license.

The NewPipe Extractor license text is included in `src/assets/data/licenses.json` and displayed in the app's open-source licenses screen.

## Other Components

Other third-party dependency notices are generated into `src/assets/data/licenses.json` and shown in the app's licenses screen. Run `npm run generate-licenses` after dependency changes.
