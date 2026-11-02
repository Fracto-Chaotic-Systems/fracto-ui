import { useEffect } from "react";
import useMidiPlayer from "../../src/pages/games/music/useMidiPlayer.js";
export let import_player;
export default function ImportProbe() {
  const player = useMidiPlayer();
  useEffect(() => {
    import_player = player;
  });
  return (
    <output id="import-state" hidden>
      {JSON.stringify({
        name: player.file_name,
        reading: player.reading,
        loaded: player.loaded,
        error: player.import_error,
      })}
    </output>
  );
}
