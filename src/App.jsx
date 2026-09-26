import React, { Component } from "react";
import PropTypes from "prop-types";
import {
  Link,
  Navigate,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { MainStyles as styles } from "./styles/MainStyles.jsx";

import Admin from "./pages/Admin.jsx";
import Data from "./pages/Data.jsx";
import Assets from "./pages/Assets.jsx";
import Tiles from "./pages/Tiles.jsx";
import Study from "./pages/Study.jsx";
import AppSettings from "./AppSettings.jsx";
import {
  APP_ROOT_SETTINGS,
  KEY_SELECTED_PAGE,
  poll_viewport_dimensions,
} from "./settings/RootSettings.jsx";
import { APP_ADMIN_SETTINGS } from "./settings/AdminSettings.jsx";
import { APP_ASSETS_SETTINGS } from "./settings/AssetsSettings.jsx";
import { APP_DATA_SETTINGS } from "./settings/DataSettings.jsx";
import { APP_TILES_SETTINGS } from "./settings/TilesSettings.jsx";
import { APP_STUDY_SETTINGS } from "./settings/StudySettings.jsx";
import { APP_ADMIN_TEXT } from "./text/AdminText.jsx";
import { AppText } from "./AppText.jsx";
import {
  APP_ROOT_TEXT,
  KEY_MENU_ADMIN,
  KEY_MENU_ASSETS,
  KEY_MENU_DATA,
  KEY_MENU_STUDY,
  KEY_MENU_TILES,
} from "./text/RootText.jsx";
import { APP_ASSETS_TEXT } from "./text/AssetsText.jsx";
import { APP_DATA_TEXT } from "./text/DataText.jsx";
import { APP_STUDY_TEXT } from "./text/StudyText.jsx";
import { APP_TILES_TEXT } from "./text/TilesText.jsx";
import { APP_NAVIGATOR_SETTINGS } from "./settings/NavigatorSettings.jsx";
import { APP_NAVIGATOR_TEXT } from "./text/NavigatorText.jsx";
import { APP_WELCOME_TEXT } from "./text/WelcomeText.jsx";
import PageWelcome from "./pages/PageWelcome.jsx";
import { KEY_WELCOME_SIGNED_IN_AS, KEY_WELCOME_SIGN_OUT } from "./text/WelcomeText.jsx";
import AuthBackend from "./backend/AuthBackend.jsx";

const ROUTES = [
  { path: "/admin", element: <Admin />, title_key: KEY_MENU_ADMIN },
  { path: "/data", element: <Data />, title_key: KEY_MENU_DATA },
  { path: "/assets", element: <Assets />, title_key: KEY_MENU_ASSETS },
  { path: "/tiles", element: <Tiles />, title_key: KEY_MENU_TILES },
  { path: "/study", element: <Study />, title_key: KEY_MENU_STUDY },
  { path: "/", title: "home" },
];

const WelcomeRoute = ({
  auth_status,
  auth_user,
  on_login,
  on_logout,
  on_start,
}) => {
  const navigate = useNavigate();
  return (
    <PageWelcome
      auth_status={auth_status}
      auth_user={auth_user}
      on_login={on_login}
      on_logout={on_logout}
      on_start={() => {
        on_start();
        navigate("/study");
      }}
    />
  );
};

WelcomeRoute.propTypes = {
  auth_status: PropTypes.string,
  auth_user: PropTypes.object,
  on_login: PropTypes.func.isRequired,
  on_logout: PropTypes.func.isRequired,
  on_start: PropTypes.func.isRequired,
};

const AppMenu = ({ selected_page, on_select }) => {
  const location = useLocation();
  if (location.pathname === "/") {
    return null;
  }
  const menu_items = ROUTES.filter((route) => route.path !== "/").map(
    (route, i) => {
      const route_title = AppText.get(route.title_key);
      const item_style = {
        color: selected_page === route_title ? "black" : "grey",
      };
      return (
        <Link
          to={route.path}
          onClick={() => on_select(route_title)}
          key={`route-${i}`}
        >
          <styles.MenuItem style={item_style}>
            {route_title}
          </styles.MenuItem>
        </Link>
      );
    },
  );
  return <styles.MenuWrapper>{menu_items}</styles.MenuWrapper>;
};

AppMenu.propTypes = {
  selected_page: PropTypes.string,
  on_select: PropTypes.func.isRequired,
};

const AppHeader = ({ auth_status, auth_user, on_logout, selected_page, on_select }) => {
  const location = useLocation();
  if (location.pathname === "/") {
    return null;
  }
  return (
    <styles.HeaderWrapper>
      <AppMenu selected_page={selected_page} on_select={on_select} />
      {auth_status === "authenticated" && auth_user && (
        <styles.HeaderAccount>
          {AppText.get(KEY_WELCOME_SIGNED_IN_AS)} {auth_user.display_name || auth_user.email}
          <styles.HeaderLogout onClick={on_logout}>
            {AppText.get(KEY_WELCOME_SIGN_OUT)}
          </styles.HeaderLogout>
        </styles.HeaderAccount>
      )}
      <styles.AppTitle>fracto</styles.AppTitle>
    </styles.HeaderWrapper>
  );
};

AppHeader.propTypes = {
  auth_status: PropTypes.string,
  auth_user: PropTypes.object,
  on_logout: PropTypes.func.isRequired,
  selected_page: PropTypes.string,
  on_select: PropTypes.func.isRequired,
};

export class App extends Component {
  state = {
    selected_page: 0,
    auth_status: "checking",
    auth_user: null,
    auth_error: null,
  };

  componentDidMount() {
    // initialize text
    const all_text = Object.assign(
      {},
      APP_ADMIN_TEXT,
      APP_ASSETS_TEXT,
      APP_DATA_TEXT,
      APP_STUDY_TEXT,
      APP_TILES_TEXT,
      APP_ROOT_TEXT,
      APP_NAVIGATOR_TEXT,
      APP_WELCOME_TEXT,
    );
    AppText.initialize(all_text);

    // initialize settings
    const all_settings = Object.assign(
      {},
      APP_ROOT_SETTINGS,
      APP_ADMIN_SETTINGS,
      APP_ASSETS_SETTINGS,
      APP_DATA_SETTINGS,
      APP_TILES_SETTINGS,
      APP_STUDY_SETTINGS,
      APP_NAVIGATOR_SETTINGS,
    );
    AppSettings.initialize(all_settings);

    const viewport_interval = poll_viewport_dimensions();
    this.setState(
      {
        viewport_interval,
        selected_page: AppSettings.get(KEY_SELECTED_PAGE),
      },
      this.check_auth_session,
    );
  }

  componentWillUnmount() {
    this.unmounted = true;
    const { viewport_interval } = this.state;
    if (viewport_interval) {
      clearInterval(viewport_interval);
    }
  }

  set_selected_page = (selected_page) => {
    AppSettings.on_settings_changed({
      [KEY_SELECTED_PAGE]: selected_page,
    });
    this.setState({ selected_page });
  };

  check_auth_session = async () => {
    try {
      const result = await AuthBackend.load_auth_session();
      if (!this.unmounted) {
        const auth_status =
          result.auth_enabled === false
            ? "bypass"
            : result.auth_state ||
              (result.authenticated
                ? result.user?.enabled === true
                  ? "authenticated"
                  : "denied"
                : "anonymous");
        this.setState({
          auth_status,
          auth_user: result.user || null,
          auth_error: null,
        });
      }
    } catch (error) {
      if (!this.unmounted) {
        this.setState({ auth_status: "error", auth_error: error.message });
      }
    }
  };

  render() {
    const { auth_status, auth_user, selected_page } = this.state;
    if (!selected_page) {
      return "...";
    }
    const all_routes = ROUTES.map((route) => {
      const element =
        route.path === "/" ? (
          <WelcomeRoute
            auth_status={auth_status}
            auth_user={auth_user}
            on_login={this.start_auth_login}
            on_logout={this.logout_auth_session}
            on_start={this.enter_application}
          />
        ) : auth_status === "authenticated" || auth_status === "bypass" ? (
          route.element
        ) : auth_status === "checking" ? (
          null
        ) : (
          <Navigate to="/" replace />
        );
      return (
        <Route
          key={`route-${route.path}`}
          path={route.path}
          element={element}
        />
      );
    });
    return [
      <styles.FixedBodyWrapper>
        <Routes key={"routes"}>{all_routes}</Routes>
      </styles.FixedBodyWrapper>,
      <AppHeader
        key="header-wrapper"
        auth_status={auth_status}
        auth_user={auth_user}
        on_logout={this.logout_auth_session}
        selected_page={selected_page}
        on_select={this.set_selected_page}
      />,
    ];
  }

  enter_application = () => {
    this.set_selected_page(AppText.get(KEY_MENU_STUDY));
  };

  start_auth_login = () => {
    this.enter_application();
    AuthBackend.start_auth_login();
  };

  logout_auth_session = async () => {
    try {
      await AuthBackend.logout_auth_session();
      await this.check_auth_session();
    } catch (error) {
      this.setState({ auth_status: "error", auth_error: error.message });
    }
  };
}

export default App;
