import React, {Component} from 'react';
import {Link, Routes, Route} from 'react-router-dom'

import {MainStyles as styles} from './styles/MainStyles.jsx'

import Admin from './pages/Admin.jsx'
import Data from './pages/Data.jsx'
import Assets from './pages/Assets.jsx'
import Tiles from './pages/Tiles.jsx'
import Study from './pages/Study.jsx'
import AppSettings from "./AppSettings.jsx";
import {
   APP_ROOT_SETTINGS,
   KEY_SELECTED_PAGE,
   poll_viewport_dimensions,
} from "./settings/RootSettings.jsx";
import {APP_ADMIN_SETTINGS} from "./settings/AdminSettings.jsx";
import {APP_ASSETS_SETTINGS} from "./settings/AssetsSettings.jsx";
import {APP_DATA_SETTINGS} from "./settings/DataSettings.jsx";
import {APP_TILES_SETTINGS} from "./settings/TilesSettings.jsx";
import {APP_STUDY_SETTINGS} from "./settings/StudySettings.jsx";
import {APP_ADMIN_TEXT} from "./text/AdminText.jsx";
import {AppText} from "./AppText.jsx";
import {APP_ROOT_TEXT} from "./text/RootText.jsx";
import {APP_ASSETS_TEXT} from "./text/AssetsText.jsx";
import {APP_DATA_TEXT} from "./text/DataText.jsx";
import {APP_STUDY_TEXT} from "./text/StudyText.jsx";
import {APP_TILES_TEXT} from "./text/TilesText.jsx";

const ROUTES = [
   {path: "/admin", element: <Admin/>, title: 'admin'},
   {path: "/data", element: <Data/>, title: 'data'},
   {path: "/assets", element: <Assets/>, title: 'assets'},
   {path: "/tiles", element: <Tiles/>, title: 'tiles'},
   {path: "/study", element: <Study/>, title: 'study'},
   {path: "/", element: <h1>Fracto</h1>, title: 'home'}
]

export class App extends Component {
   state = {
      selected_page: 0
   }

   componentDidMount() {
      // initialize text
      const all_text = Object.assign({},
         APP_ADMIN_TEXT,
         APP_ASSETS_TEXT,
         APP_DATA_TEXT,
         APP_STUDY_TEXT,
         APP_TILES_TEXT,
         APP_ROOT_TEXT,
      )
      AppText.initialize(all_text)

      // initialize settings
      const all_settings = Object.assign({},
         APP_ROOT_SETTINGS,
         APP_ADMIN_SETTINGS,
         APP_ASSETS_SETTINGS,
         APP_DATA_SETTINGS,
         APP_TILES_SETTINGS,
         APP_STUDY_SETTINGS,
      )
      AppSettings.initialize(all_settings)

      const viewport_interval = poll_viewport_dimensions()
      this.setState({
         viewport_interval,
         selected_page: AppSettings.get(KEY_SELECTED_PAGE)
      })
   }

   componentWillUnmount() {
      const {viewport_interval} = this.state
      if (viewport_interval) {
         clearInterval(viewport_interval)
      }
   }

   set_selected_page = (selected_page) => {
      AppSettings.on_settings_changed({
         [KEY_SELECTED_PAGE]: selected_page
      })
      this.setState({selected_page})
   }

   render() {
      const {selected_page} = this.state
      if (!selected_page) {
         return ('...')
      }
      const all_routes = ROUTES.map(route => {
         return <Route
            key={`route-${route.title}`}
            path={route.path}
            element={route.element}
         />
      })
      const menu = ROUTES
         .filter(route => route.path !== '/')
         .map((route, i) => {
            const item_style = {
               left: `${20 + i * 60}px`,
               color: selected_page === route.title ? 'black' : 'grey'
            }
            return <Link
               to={route.path}
               onClick={() => this.set_selected_page(route.title)}
               key={`route-${i}`}>
               <styles.MenuItem
                  key={`menu-item-${i}`}
                  style={item_style}>
                  {route.title}
               </styles.MenuItem>
            </Link>
         })
      return [
         <styles.HeaderWrapper key={'header-wrapper'}>
            {menu}
            <styles.AppTitle>fracto</styles.AppTitle>
         </styles.HeaderWrapper>,
         <Routes key={'routes'}>{all_routes}</Routes>
      ]
   }
}

export default App
