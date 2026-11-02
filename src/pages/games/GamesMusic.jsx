import { useRef } from "react";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import { KEY_GAMES_MUSIC_TITLE, MUSIC_TEXT } from "../../text/GamesText.jsx";
import useMidiPlayer from "./music/useMidiPlayer.js";
import {
  MusicPanel,
  MusicControls,
  MusicButton,
  MusicError,
  MusicProgress,
} from "./music/MusicStyles.jsx";

const text = (key) => AppText.get(MUSIC_TEXT[key]);
const time = (seconds) => {
  const total = Math.floor(seconds || 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export default function GamesMusic() {
  const input = useRef(null);
  const player = useMidiPlayer();
  const { snapshot, loaded, reading, file_name, import_error } = player;
  const busy =
    reading || snapshot.status === "loading" || snapshot.status === "playing";
  const error_code =
    import_error ||
    (snapshot.error &&
      (MUSIC_TEXT[snapshot.error.code]
        ? snapshot.error.code
        : "playback_failed"));
  return (
    <>
      <styles.SectionTitle>
        {AppText.get(KEY_GAMES_MUSIC_TITLE)}
      </styles.SectionTitle>
      <MusicPanel aria-label={AppText.get(KEY_GAMES_MUSIC_TITLE)}>
        <p>{text("help")}</p>
        <input
          ref={input}
          type="file"
          accept=".mid,.midi,audio/midi,audio/x-midi"
          aria-label={text("file_input")}
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void player.open_file(file);
          }}
        />
        <MusicControls>
          <MusicButton onClick={() => input.current?.click()}>
            {text("open")}
          </MusicButton>
          <MusicButton disabled={!loaded || busy} onClick={player.play}>
            {text("play")}
          </MusicButton>
          <MusicButton disabled={!busy} onClick={player.stop}>
            {text("stop")}
          </MusicButton>
        </MusicControls>
        <p>{file_name || text("no_file")}</p>
        <p role="status" aria-live="polite">
          {text(reading ? "reading" : snapshot.status) || text("idle")}
        </p>
        {loaded && (
          <MusicProgress aria-label={text("progress")}>
            {time(snapshot.position_seconds)} /{" "}
            {time(snapshot.duration_seconds)}
          </MusicProgress>
        )}
        {error_code && <MusicError role="alert">{text(error_code)}</MusicError>}
        {snapshot.warnings.length > 0 && (
          <ul>
            {snapshot.warnings.map((warning) => (
              <li key={warning.code}>
                {text(warning.code).replace("{count}", String(warning.count))}
              </li>
            ))}
          </ul>
        )}
      </MusicPanel>
    </>
  );
}
