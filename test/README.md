# UI tests

This directory contains Node.js tests for UI behavior and pure feature helpers.
Run a focused suite with its `test:*` script in `package.json`; tests use the
built-in `node:test` runner and do not require a browser unless noted.

- `admin_commit_timeline.test.js` verifies commit timeline grouping and
  presentation helpers.
- `admin_reference_tree.test.js` verifies construction and restoration of the
  Reference page's repository tree.
- `admin_servers_address_book.test.js` verifies URL normalization, duplicate
  merging, invalid-input preservation, and serialization above the default
  AppSettings object-size limit, plus validation of the remote health contract.
- `auth_callback_error.test.js`, `authenticated_entry.test.js`, and
  `welcome_auth_states.test.js` verify login callback errors, authenticated
  entry navigation, and welcome-page authentication states.
- `automation_engine.test.js` verifies page automation scheduling and state
  transitions.
- `circuitry_audio.test.js` and `circuitry_audio_controller.test.js` verify
  circuitry audio behavior and its controller.
- `orbital_pipeline_contract.test.js` verifies the UI contract for orbital
  processing.
- `video_edit_history.test.js` verifies video-edit history behavior.
