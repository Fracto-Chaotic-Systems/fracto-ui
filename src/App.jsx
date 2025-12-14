import React, {Component} from 'react';
import {Link, Routes, Route} from 'react-router-dom'

import {MainStyles as styles} from './styles/MainStyles.jsx'

import Admin from './pages/Admin.jsx'
import Data from './pages/Data.jsx'
import Assets from './pages/Assets.jsx'
import Tiles from './pages/Tiles.jsx'
import Study from './pages/Study.jsx'

const ROUTES = [
   {path: "/admin", element: <Admin/>, title: 'admin'},
   {path: "/data", element: <Data/>, title: 'data'},
   {path: "/assets", element: <Assets/>, title: 'assets'},
   {path: "/study", element: <Study/>, title: 'study'},
   {path: "/tiles", element: <Tiles/>, title: 'tiles'},
   {path: "/", element: <h1>Fracto</h1>, title: 'home'}
]

export class App extends Component {
   state = {
      selected_page: 'admin',
      app_settings: {}
   }

   render() {
      const {selected_page} = this.state
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
               onClick={() => this.setState({selected_page: route.title})}
               key={`route-${i}`}>
               <styles.MenuItem
                  key={`menu-item-${i}`}
                  style={item_style}>
                  {route.title}
               </styles.MenuItem>
            </Link>
         })
      return [
         <styles.HeaderWrapper>
            {menu}
            <styles.AppTitle>fracto</styles.AppTitle>
         </styles.HeaderWrapper>,
         <Routes>{all_routes}</Routes>
      ]
   }
}

export default App
