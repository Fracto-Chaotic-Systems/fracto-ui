import styled from "styled-components";
import GamesCrt from "./GamesCrt.jsx";

const CornerTv = styled.div`
  position: absolute;
  top: 0;
  left: -50px;
  z-index: ${({ $prelude }) => ($prelude ? 3 : 0)};
  visibility: ${({ $visible }) => ($visible ? "visible" : "hidden")};
  width: clamp(425px, 67.5%, 725px);
  max-width: calc(125% - 3.75rem);
  aspect-ratio: 1.25;
  pointer-events: none;
  > div {
    height: 100%;
  }
  button {
    pointer-events: auto;
  }
`;

// Keep the initialized rig across resets: rebuilding it would block opening text.
export default function GamesPlayTv({ crt_content, visible, prelude }) {
  return (
    <CornerTv $visible={visible} $prelude={prelude} aria-hidden={!visible}>
      <GamesCrt screen_content={crt_content} />
    </CornerTv>
  );
}
