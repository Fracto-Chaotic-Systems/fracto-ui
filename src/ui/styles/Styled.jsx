import React, {Component} from 'react';
import PropTypes from 'prop-types';

export class Styled extends Component {
   static propTypes = {
      basis: PropTypes.string,
   }

   render() {
      const {basis, children} = this.props
      return <div
         style={{display: 'inline-block'}} {...this.props} {...basis} >
         {children}
      </div>
   }
}

export default Styled
