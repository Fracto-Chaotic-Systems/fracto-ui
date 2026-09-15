import React, { Component } from "react";
import PropTypes from "prop-types";
import {
  append_snapshot,
  clone_video,
  move_position,
} from "./VideoEditHistoryUtils.js";

/**
 * Maintains the in-memory history of a video project.
 *
 * This component intentionally has no persistence or editor UI. The caller
 * owns loading and saving records, while this class will provide snapshot
 * traversal to the editing panes in later history milestones.
 */
export class VideoEditHistory extends Component {
  static propTypes = {
    video: PropTypes.object,
    on_change: PropTypes.func.isRequired,
  };

  static defaultProps = {
    video: null,
  };

  state = {
    history: [],
    position: -1,
  };

  change_queue = Promise.resolve();

  componentDidMount() {
    this.load(this.props.video);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.video?.id !== this.props.video?.id) {
      this.load(this.props.video);
    }
  }

  /**
   * Starts a new history session from a loaded video snapshot.
   * @param {Object|null} video Complete video record or null.
   */
  load = (video) => {
    const snapshot = clone_video(video);
    this.setState({
      history: snapshot ? [snapshot] : [],
      position: snapshot ? 0 : -1,
    });
  };

  /**
   * Returns the snapshot currently selected by the history cursor.
   * @returns {Object|null} Current immutable snapshot, if one is loaded.
   */
  get_current_snapshot = () => {
    const { history, position } = this.state;
    return position >= 0 && position < history.length
      ? history[position]
      : null;
  };

  /**
   * Indicates whether the history cursor currently points at a snapshot.
   * @returns {boolean} True when a current snapshot is available.
   */
  has_current_snapshot = () => this.get_current_snapshot() !== null;

  /**
   * Serializes notifications so persistence requests cannot overtake one
   * another when edits and traversals happen in quick succession.
   * @param {Object} snapshot Immutable video snapshot to emit.
   * @returns {Promise<void>} Completion of the queued notification.
   */
  notify_change = (snapshot) => {
    this.change_queue = this.change_queue
      .catch(() => {})
      .then(() => this.props.on_change(snapshot));
    return this.change_queue;
  };

  /**
   * Indicates whether an undo traversal is available.
   * @returns {boolean} True when an earlier snapshot exists.
   */
  can_undo = () => this.state.position > 0;

  /**
   * Indicates whether a redo traversal is available.
   * @returns {boolean} True when a later snapshot exists.
   */
  can_redo = () =>
    this.state.position >= 0 &&
    this.state.position < this.state.history.length - 1;

  /**
   * Records a normal edit and makes it the current history state.
   * Forward states are discarded when editing after a prior traversal.
   * @param {Object} video Complete video record after the edit.
   */
  record_edit = (video) => {
    const result = append_snapshot(
      this.state.history,
      this.state.position,
      video,
    );
    if (!result.changed) {
      return;
    }
    this.setState(
      { history: result.history, position: result.position },
      () => this.notify_change(this.get_current_snapshot()),
    );
  };

  /**
   * Traverses one step backward through the history.
   * @returns {boolean} True when an earlier snapshot was applied.
   */
  undo = () => {
    const next_position = move_position(
      this.state.history,
      this.state.position,
      -1,
    );
    if (next_position === this.state.position) {
      return false;
    }
    this.setState(
      { position: next_position },
      () => this.notify_change(this.get_current_snapshot()),
    );
    return true;
  };

  /**
   * Traverses one step forward through available history.
   * @returns {boolean} True when a later snapshot was applied.
   */
  redo = () => {
    const next_position = move_position(
      this.state.history,
      this.state.position,
      1,
    );
    if (next_position === this.state.position) {
      return false;
    }
    this.setState(
      { position: next_position },
      () => this.notify_change(this.get_current_snapshot()),
    );
    return true;
  };

  render() {
    return null;
  }
}

export default VideoEditHistory;
