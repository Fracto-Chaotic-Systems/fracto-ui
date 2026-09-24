import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../AppText.jsx";
import { AssetsBackend } from "../backend/AssetsBackend.jsx";
import { WelcomeStyles as styles } from "../styles/WelcomeStyles.jsx";
import FractoUIColors from "../utils/render/FractoUIColors.jsx";
import {
  KEY_WELCOME_INTRO,
  KEY_WELCOME_NO_IMAGES,
  KEY_WELCOME_START,
  KEY_WELCOME_TITLE,
} from "../text/WelcomeText.jsx";

const BACKGROUND_REFRESH_CADENCE_MS = 25;
const IMAGE_REFRESH_TICKS = 800;

const shuffle = (values) => {
  const shuffled = values.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap_index = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swap_index]] = [
      shuffled[swap_index],
      shuffled[index],
    ];
  }
  return shuffled;
};

/**
 * Initial current-UI scaffold for the Fracto welcome page.
 *
 * The required callback preserves the old page's entry-point contract for the
 * eventual application-shell integration.
 */
export class PageWelcome extends Component {
  static propTypes = {
    on_start: PropTypes.func.isRequired,
  };

  state = {
    show_info: false,
    welcome_images: [],
    shuffled_images: [],
    previous_image: null,
    loading_images: false,
    image_load_complete: false,
    image_index: 0,
    refresh_counter: 0,
    pan_x: 0,
    pan_y: 0,
    pan_x_direction: 1,
    pan_y_direction: 1,
    letter_color: "white",
    wrapper_ref: React.createRef(),
  };

  componentDidMount() {
    this.unmounted = false;
    this.load_welcome_images();
  }

  componentWillUnmount() {
    this.stop_background_animation();
    if (this.fade_timeout) {
      clearTimeout(this.fade_timeout);
    }
    this.unmounted = true;
  }

  /** Load and normalize the image records used by the welcome background. */
  load_welcome_images = async () => {
    this.setState({ loading_images: true });
    const welcome_images = await AssetsBackend.load_welcome_images();
    if (this.unmounted) {
      return;
    }
    this.setState(
      {
        welcome_images,
        shuffled_images: shuffle(welcome_images),
        loading_images: false,
        image_load_complete: true,
        image_index: 0,
        refresh_counter: 0,
        pan_x: 0,
        pan_y: 0,
        pan_x_direction: 1,
        pan_y_direction: -1,
      },
      this.start_background_animation,
    );
  };

  /** Start the periodic background pan and image rotation. */
  start_background_animation = () => {
    this.stop_background_animation();
    if (!this.state.shuffled_images.length) {
      return;
    }
    this.animation_interval = setInterval(
      this.update_background,
      BACKGROUND_REFRESH_CADENCE_MS,
    );
  };

  /** Stop the background timer without affecting the loaded image state. */
  stop_background_animation = () => {
    if (this.animation_interval) {
      clearInterval(this.animation_interval);
      this.animation_interval = null;
    }
  };

  /** Preload a rotated image before exposing it as the visible background. */
  preload_image = (image_index) => {
    if (this.pending_image_index === image_index) {
      return;
    }
    const image = this.state.shuffled_images[image_index];
    if (!image) {
      return;
    }
    this.pending_image_index = image_index;
    const image_loader = new Image();
    image_loader.onload = () => {
      this.pending_image_index = null;
      if (!this.unmounted) {
        const previous_image = this.state.shuffled_images[this.state.image_index];
        this.setState({ image_index, previous_image });
        this.fade_timeout = setTimeout(() => {
          if (!this.unmounted) {
            this.setState({ previous_image: null });
          }
        }, 900);
      }
    };
    image_loader.onerror = () => {
      this.pending_image_index = null;
    };
    image_loader.src = image.public_url;
  };

  /** Advance the pan position and rotate to the next image when due. */
  update_background = () => {
    const { wrapper_ref } = this.state;
    if (!wrapper_ref.current) {
      return;
    }
    this.setState((previous) => {
      const bounds = wrapper_ref.current.getBoundingClientRect();
      const max_x_offset = Math.max(0, 4800 - bounds.width);
      const max_y_offset = Math.max(0, 4800 - bounds.height);
      const next_pan_x =
        previous.pan_x + previous.pan_x_direction;
      const next_pan_y =
        previous.pan_y + previous.pan_y_direction;
      const pan_x_direction =
        next_pan_x <= 0 || next_pan_x >= max_x_offset
          ? previous.pan_x_direction * -1
          : previous.pan_x_direction;
      const pan_y_direction =
        next_pan_y <= 0 || next_pan_y >= max_y_offset
          ? previous.pan_y_direction * -1
          : previous.pan_y_direction;
      const refresh_counter = previous.refresh_counter + 1;
      const image_index =
        Math.floor(refresh_counter / IMAGE_REFRESH_TICKS) %
        previous.shuffled_images.length;
      const change_image = image_index !== previous.image_index;
      const color_hsl = FractoUIColors.fracto_pattern_color_hsl(
        (refresh_counter % 2 ** 10) + 100,
        1000000,
      );
      const letter_color = `hsl(${color_hsl[0]}, ${color_hsl[1]}%, ${color_hsl[2]}%)`;
      if (change_image) {
        this.preload_image(image_index);
      }
      return {
        image_index: previous.image_index,
        refresh_counter,
        pan_x: Math.max(0, Math.min(max_x_offset, next_pan_x)),
        pan_y: Math.max(0, Math.min(max_y_offset, next_pan_y)),
        pan_x_direction,
        pan_y_direction,
        letter_color,
      };
    });
  };

  /** Preserve the legacy info-panel gesture and application-entry shortcut. */
  handle_start = (event) => {
    const { on_start } = this.props;
    if (event.altKey && event.ctrlKey && event.shiftKey) {
      on_start();
      return;
    }
    this.setState(({ show_info }) => ({ show_info: !show_info }));
  };

  render() {
    const {
      image_index,
      image_load_complete,
      letter_color,
      pan_x,
      pan_y,
      show_info,
      shuffled_images,
    } = this.state;
    const current_image = shuffled_images[image_index];
    return (
      <styles.Wrapper ref={this.state.wrapper_ref}>
        {this.state.previous_image && (
          <styles.PreviousImageLayer
            key={`previous-${this.state.previous_image.asset_id}`}
            style={{
              backgroundImage: `url("${this.state.previous_image.public_url}")`,
              backgroundPosition: `-${pan_x}px -${pan_y}px`,
            }}
          />
        )}
        {current_image && (
          <styles.ImageLayer
            key={current_image.asset_id}
            style={{
              backgroundImage: `url("${current_image.public_url}")`,
              backgroundPosition: `-${pan_x}px -${pan_y}px`,
            }}
          />
        )}
        <styles.Content>
          <styles.Title style={{ color: letter_color }}>
            {AppText.get(KEY_WELCOME_TITLE)}
          </styles.Title>
          <styles.StartButton onClick={this.handle_start}>
            {AppText.get(KEY_WELCOME_START)}
          </styles.StartButton>
          <styles.InfoBox
            style={{
              opacity: show_info || (image_load_complete && !current_image) ? 1 : 0,
              pointerEvents:
                show_info || (image_load_complete && !current_image)
                  ? "auto"
                  : "none",
            }}
          >
            {image_load_complete && !current_image
              ? AppText.get(KEY_WELCOME_NO_IMAGES)
              : AppText.get(KEY_WELCOME_INTRO)}
          </styles.InfoBox>
        </styles.Content>
      </styles.Wrapper>
    );
  }
}

export default PageWelcome;
