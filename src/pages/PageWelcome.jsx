import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../AppText.jsx";
import { AssetsBackend } from "../backend/AssetsBackend.jsx";
import { WelcomeStyles as styles } from "../styles/WelcomeStyles.jsx";
import FractoUIColors from "../utils/render/FractoUIColors.jsx";
import {
  KEY_WELCOME_ACCESS_DENIED,
  KEY_WELCOME_AUTH_ERROR,
  KEY_WELCOME_CHECKING_ACCESS,
  KEY_WELCOME_NO_IMAGES,
  KEY_WELCOME_SIGN_IN,
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
    auth_status: PropTypes.oneOf([
      "checking",
      "bypass",
      "anonymous",
      "authenticated",
      "denied",
      "error",
    ]),
    auth_user: PropTypes.object,
    on_start: PropTypes.func.isRequired,
    on_login: PropTypes.func,
    on_logout: PropTypes.func,
  };

  state = {
    login_open: false,
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

  /** Toggle the login surface without interrupting the background animation. */
  toggle_login = () => {
    this.setState(({ login_open }) => ({ login_open: !login_open }));
  };

  /** Open the login surface from the visible welcome action. */
  handle_start = (event) => {
    event.stopPropagation();
    this.setState({ login_open: true });
  };

  /** Perform the action appropriate for the current authentication state. */
  handle_login_action = (event) => {
    event.stopPropagation();
    const { auth_status, on_login, on_start } = this.props;
    if (auth_status === "anonymous" || auth_status === "error") {
      on_login?.();
      return;
    }
    if (auth_status === "bypass" || auth_status === "authenticated") {
      on_start?.();
    }
  };

  /** Sign out without allowing the page-level click handler to reopen the panel. */
  handle_logout = (event) => {
    event.stopPropagation();
    this.props.on_logout?.();
  };

  render_access_message = () => {
    const { auth_status } = this.props;
    if (auth_status === "checking") {
      return AppText.get(KEY_WELCOME_CHECKING_ACCESS);
    }
    if (auth_status === "denied") {
      return AppText.get(KEY_WELCOME_ACCESS_DENIED);
    }
    if (auth_status === "error") {
      return AppText.get(KEY_WELCOME_AUTH_ERROR);
    }
    return null;
  };

  render() {
    const {
      image_index,
      image_load_complete,
      login_open,
      letter_color,
      pan_x,
      pan_y,
      shuffled_images,
    } = this.state;
    const { auth_status } = this.props;
    const current_image = shuffled_images[image_index];
    const access_message = this.render_access_message();
    const button_text =
      auth_status === "anonymous" || auth_status === "error"
        ? AppText.get(KEY_WELCOME_SIGN_IN)
        : AppText.get(KEY_WELCOME_START);
    const can_show_button =
      auth_status === "anonymous" ||
      auth_status === "bypass" ||
      auth_status === "authenticated" ||
      auth_status === "error";
    return (
      <styles.Wrapper
        ref={this.state.wrapper_ref}
        onClick={this.toggle_login}
      >
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
        <styles.TitleLayer
          data-login-open={login_open ? "true" : "false"}
          style={{ color: letter_color }}
        >
          {AppText.get(KEY_WELCOME_TITLE)}
        </styles.TitleLayer>
        <styles.Content>
          {!login_open && access_message && (
            <styles.AccessMessage>{access_message}</styles.AccessMessage>
          )}
          {image_load_complete && !current_image && !login_open && (
            <styles.InfoBox>
              {AppText.get(KEY_WELCOME_NO_IMAGES)}
            </styles.InfoBox>
          )}
        </styles.Content>
        {can_show_button && (
          <styles.SubtitleLayer
            data-login-open={login_open ? "true" : "false"}
            onClick={login_open ? this.handle_login_action : this.handle_start}
          >
            {button_text}
          </styles.SubtitleLayer>
        )}
        <styles.LoginPanel
          data-login-open={login_open ? "true" : "false"}
          aria-hidden={!login_open}
          onClick={(event) => event.stopPropagation()}
        />
      </styles.Wrapper>
    );
  }
}

export default PageWelcome;
