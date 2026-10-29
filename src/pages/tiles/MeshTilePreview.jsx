import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import TilesBackend from "../../backend/TilesBackend.jsx";
import AppText from "../../AppText.jsx";
import { MESH_OPERATION_TEXT as TEXT } from "../../text/TilesText.jsx";
import { TILE_RENDER_WIDTH_PX } from "./TilesUtils.jsx";
import {
  decode_preview_mesh,
  paint_preview_tile,
} from "./MeshTilePreviewData.js";
import MeshTilePreviewScene from "./MeshTilePreviewScene.js";

const Preview = styled.div`
  .canvases {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }
  figure {
    margin: 0;
    flex: 0 0 ${TILE_RENDER_WIDTH_PX}px;
  }
  canvas {
    display: block;
    width: ${TILE_RENDER_WIDTH_PX}px;
    height: ${TILE_RENDER_WIDTH_PX}px;
    box-shadow: 5px 5px 10px #0004;
  }
  figcaption {
    text-align: center;
    margin: 0.5rem 0;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
`;

export default class MeshTilePreview extends Component {
  static propTypes = {
    short_code: PropTypes.string,
    scope: PropTypes.number.isRequired,
  };
  source = React.createRef();
  terrain = React.createRef();
  state = {
    status: "preview_waiting",
    height: 1,
    displayed: null,
    webgl_failed: false,
  };
  sequence = 0;
  componentDidMount() {
    this.alive = true;
    try {
      this.scene = new MeshTilePreviewScene(
        this.terrain.current,
        TILE_RENDER_WIDTH_PX,
      );
    } catch {
      this.setState({ webgl_failed: true });
    }
    this.load();
  }
  componentDidUpdate(previous) {
    if (previous.short_code !== this.props.short_code) this.load();
    else if (previous.scope !== this.props.scope) this.install();
  }
  componentWillUnmount() {
    this.alive = false;
    this.sequence++;
    this.request?.abort();
    this.scene?.dispose();
  }
  install = () => {
    if (this.data && this.scene)
      this.scene.install(
        this.data,
        this.texture,
        this.props.scope,
        this.state.height,
      );
  };
  load = async () => {
    const sequence = ++this.sequence;
    this.request?.abort();
    if (!this.props.short_code) return;
    const code = this.props.short_code;
    const request = (this.request = new AbortController());
    const timeout = setTimeout(() => request.abort(), 20000);
    this.setState({ status: "preview_loading" });
    try {
      const compressed = await TilesBackend.mesh_file(code, {
        signal: request.signal,
      });
      const data = await decode_preview_mesh(compressed);
      if (!this.alive || sequence !== this.sequence) return;
      if (data.metadata.short_code !== code) throw new Error("Wrong tile mesh");
      this.data = data;
      this.texture = document.createElement("canvas");
      this.texture.width = this.texture.height = 256;
      paint_preview_tile(data, this.texture);
      const context = this.source.current.getContext("2d");
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, TILE_RENDER_WIDTH_PX, TILE_RENDER_WIDTH_PX);
      context.drawImage(
        this.texture,
        0,
        0,
        TILE_RENDER_WIDTH_PX,
        TILE_RENDER_WIDTH_PX,
      );
      this.install();
      this.setState({ status: null, displayed: code });
    } catch {
      if (this.alive && sequence === this.sequence)
        this.setState({ status: "preview_failed" });
    } finally {
      clearTimeout(timeout);
    }
  };
  change_height = (event) =>
    this.setState({ height: Number(event.target.value) }, this.install);
  render() {
    const { status, height, displayed, webgl_failed } = this.state;
    return (
      <Preview>
        <div className="canvases">
          <figure>
            <canvas
              ref={this.source}
              width={TILE_RENDER_WIDTH_PX}
              height={TILE_RENDER_WIDTH_PX}
              aria-label={AppText.get(TEXT.preview_tile)}
            />
            <figcaption>
              {AppText.get(TEXT.preview_tile)}
              {displayed && ` · ${displayed}`}
            </figcaption>
          </figure>
          <figure>
            <canvas
              ref={this.terrain}
              width={TILE_RENDER_WIDTH_PX}
              height={TILE_RENDER_WIDTH_PX}
              aria-label={AppText.get(TEXT.preview_mesh)}
            />
            <figcaption>{AppText.get(TEXT.preview_mesh)}</figcaption>
          </figure>
        </div>
        {status && <p role="status">{AppText.get(TEXT[status])}</p>}
        {webgl_failed && <p role="alert">{AppText.get(TEXT.preview_webgl)}</p>}
        <label>
          {AppText.get(TEXT.preview_height)}
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={height}
            onChange={this.change_height}
            disabled={webgl_failed}
          />
          <output>{Math.round(height * 100)}%</output>
        </label>
      </Preview>
    );
  }
}
