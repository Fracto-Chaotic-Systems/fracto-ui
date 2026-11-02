const GAMES_FOLDER = "games";

export const KEY_GAMES_MUSIC = `${GAMES_FOLDER}/music`;
export const KEY_GAMES_MUSIC_TITLE = `${GAMES_FOLDER}/music_title`;

export const KEY_GAMES_WORLDS = `${GAMES_FOLDER}/worlds`;
export const KEY_GAMES_WORLDS_TITLE = `${GAMES_FOLDER}/worlds_title`;

export const KEY_GAMES_WORDNET = `${GAMES_FOLDER}/wordnet`;
export const KEY_GAMES_WORDNET_TITLE = `${GAMES_FOLDER}/wordnet_title`;

export const WORDNET_TEXT = Object.fromEntries(
  [
    "loading",
    "error",
    "retry",
    "tree",
    "scope",
    "count",
    "synset",
    "children",
    "license",
    "breadcrumbs",
    "predecessors",
    "descendants",
  ].map((key) => [key, `${GAMES_FOLDER}/wordnet_${key}`]),
);
export const WORLDS_TEXT = Object.fromEntries(
  [
    "cardinality",
    "assigned_only",
    "assigned_worlds",
    "factorization",
    "name",
    "notes",
    "notes_placeholder",
    "edit_notes",
    "view_notes",
    "expand_notes",
    "collapse_notes",
    "save_notes_error",
    "reload_notes",
    "association",
    "unassigned",
    "contenders",
    "help",
    "scope",
    "search",
    "previous",
    "next",
    "rows",
    "mapped",
    "empty",
    "tray_help",
    "download_csv",
    "refresh",
    "show_card",
    "loading",
    "error",
    "retry",
  ].map((key) => [key, `${GAMES_FOLDER}/worlds_${key}`]),
);
export const MUSIC_TEXT = Object.fromEntries(
  [
    "open",
    "play",
    "stop",
    "no_file",
    "file_input",
    "progress",
    "help",
    "idle",
    "reading",
    "ready",
    "loading",
    "playing",
    "stopped",
    "completed",
    "error",
    "invalid_midi_file",
    "file_read_failed",
    "file_too_large",
    "sample_load_failed",
    "invalid_sample",
    "sample_memory_limit",
    "unsupported_pitch",
    "unsupported_percussion",
    "invalid_velocity",
    "no_song",
    "playback_failed",
    "unmatched_note_off",
    "unfinished_notes",
    "piano_pitch_out_of_range",
    "percussion_channel",
    "trailing_bytes_ignored",
    "sample_shorter_than_note",
  ].map((key) => [key, `${GAMES_FOLDER}/music_${key}`]),
);

export const APP_GAMES_TEXT = {
  [MUSIC_TEXT.open]: "Open MIDI",
  [MUSIC_TEXT.play]: "Play",
  [MUSIC_TEXT.stop]: "Stop",
  [MUSIC_TEXT.no_file]: "No MIDI file selected.",
  [MUSIC_TEXT.file_input]: "Select a MIDI file",
  [MUSIC_TEXT.progress]: "Playback position",
  [MUSIC_TEXT.help]:
    "Open a MIDI file, then press Play. Files stay in your browser. Piano playback supports pitches 21–108; percussion is not supported.",
  [MUSIC_TEXT.idle]: "Open a MIDI file to begin.",
  [MUSIC_TEXT.reading]: "Reading MIDI file…",
  [MUSIC_TEXT.ready]: "Ready to play.",
  [MUSIC_TEXT.loading]: "Loading piano samples…",
  [MUSIC_TEXT.playing]: "Playing.",
  [MUSIC_TEXT.stopped]: "Stopped. Press Play to restart from the beginning.",
  [MUSIC_TEXT.completed]: "Playback complete.",
  [MUSIC_TEXT.error]: "Playback could not start.",
  [MUSIC_TEXT.invalid_midi_file]:
    "This MIDI file is invalid or unsupported. Choose a format 0 or 1 file with PPQ timing and note events.",
  [MUSIC_TEXT.file_read_failed]:
    "The file could not be read. Try opening it again.",
  [MUSIC_TEXT.file_too_large]:
    "The MIDI file is too large. Choose a file up to 8 MiB.",
  [MUSIC_TEXT.sample_load_failed]:
    "A piano sample could not be loaded. Check your connection and press Play to retry.",
  [MUSIC_TEXT.invalid_sample]:
    "A piano sample could not be decoded. Press Play to retry.",
  [MUSIC_TEXT.sample_memory_limit]:
    "This song needs more piano sample memory than the player supports. Choose a smaller song.",
  [MUSIC_TEXT.unsupported_pitch]:
    "This song includes notes outside piano pitches 21–108. Choose a file within this range.",
  [MUSIC_TEXT.unsupported_percussion]:
    "This song includes a percussion channel. Choose a MIDI file without percussion.",
  [MUSIC_TEXT.invalid_velocity]:
    "This MIDI file contains an invalid note velocity. Choose another file.",
  [MUSIC_TEXT.no_song]: "Open a MIDI file before pressing Play.",
  [MUSIC_TEXT.playback_failed]:
    "Audio could not start. Check browser sound permissions and press Play to retry.",
  [MUSIC_TEXT.unmatched_note_off]:
    "{count} unmatched note releases were ignored.",
  [MUSIC_TEXT.unfinished_notes]:
    "{count} unfinished notes were closed at the end of the song.",
  [MUSIC_TEXT.piano_pitch_out_of_range]:
    "{count} notes are outside the supported piano range.",
  [MUSIC_TEXT.percussion_channel]: "{count} percussion notes are unsupported.",
  [MUSIC_TEXT.trailing_bytes_ignored]:
    "{count} extra bytes after the MIDI tracks were ignored.",
  [MUSIC_TEXT.sample_shorter_than_note]:
    "{count} long notes exceed their piano sample length and will fade before their MIDI release.",
  [KEY_GAMES_MUSIC]: "music",
  [KEY_GAMES_MUSIC_TITLE]: "All Music",
  [WORLDS_TEXT.show_card]: "show card",
  [WORLDS_TEXT.refresh]: "refresh worlds",
  [WORLDS_TEXT.download_csv]: "download CSV",
  [WORLDS_TEXT.loading]: "loading worlds...",
  [WORLDS_TEXT.error]: "Unable to load worlds.",
  [WORLDS_TEXT.retry]: "retry",
  [WORLDS_TEXT.assigned_only]: "show assigned only",
  [WORLDS_TEXT.assigned_worlds]: "assigned worlds",
  [WORLDS_TEXT.cardinality]: "card",
  [WORLDS_TEXT.factorization]: "formula",
  [WORLDS_TEXT.name]: "name",
  [WORLDS_TEXT.notes]: "notes",
  [WORLDS_TEXT.edit_notes]: "edit notes",
  [WORLDS_TEXT.view_notes]: "view notes",
  [WORLDS_TEXT.expand_notes]: "expand notes and bring row to top",
  [WORLDS_TEXT.collapse_notes]: "collapse notes",
  [WORLDS_TEXT.save_notes_error]:
    "Notes were not saved. Retry, or reload the server version if it changed.",
  [WORLDS_TEXT.reload_notes]: "reload server notes",
  [WORLDS_TEXT.notes_placeholder]: "add notes...",
  [WORLDS_TEXT.association]: "theme",
  [WORLDS_TEXT.unassigned]: "unassigned",
  [WORLDS_TEXT.contenders]: "all themes",
  [WORLDS_TEXT.help]:
    "Associations are curated in the database so changes can be considered together with their compound meanings. Notes are saved to the database when you leave the field.",
  [WORLDS_TEXT.scope]:
    "Curated abstractions with defined placements, including every cardinality from 1 through 256. Notes explain archetypes, creative compounds and WordNet specializations.",
  [WORLDS_TEXT.search]: "filter themes",
  [WORLDS_TEXT.previous]: "previous",
  [WORLDS_TEXT.next]: "next",
  [WORLDS_TEXT.rows]: "cardinalities",
  [WORLDS_TEXT.mapped]: "assigned to",
  [WORLDS_TEXT.empty]: "no matching contenders",
  [WORLDS_TEXT.tray_help]:
    "All contenders are listed with their assigned cardinalities. Use the filter to find a word or definition.",
  [KEY_GAMES_WORLDS]: "worlds",
  [KEY_GAMES_WORLDS_TITLE]: "all worlds",
  [WORDNET_TEXT.loading]: "loading abstract nouns...",
  [WORDNET_TEXT.error]: "Unable to load abstract nouns.",
  [WORDNET_TEXT.retry]: "retry",
  [WORDNET_TEXT.tree]: "abstract noun hierarchy",
  [WORDNET_TEXT.scope]:
    "The abstraction / abstract entity branch, including instance descendants. Shared concepts appear under each parent; this is a starting scope rather than a grammatical classification of every abstract noun.",
  [WORDNET_TEXT.count]: "synsets in this branch",
  [WORDNET_TEXT.synset]: "synset",
  [WORDNET_TEXT.children]: "direct descendants",
  [WORDNET_TEXT.predecessors]: "predecessors",
  [WORDNET_TEXT.breadcrumbs]: "taxonomy path",
  [WORDNET_TEXT.descendants]: "immediate descendants",
  [WORDNET_TEXT.license]: "license",
  [KEY_GAMES_WORDNET]: "wordnet",
  [KEY_GAMES_WORDNET_TITLE]: "wordnet reference",
};
