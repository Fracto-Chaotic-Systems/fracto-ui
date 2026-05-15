import React, {Component} from "react";
import PropTypes from "prop-types";

export class VideoOperationsBlock extends Component {
   static propTypes = {
      video_script: PropTypes.object.isRequired,
      on_update_script: PropTypes.func.isRequired,
   }

   render() {
      return 'VideoOperationsBlock'
   }
}

export default VideoOperationsBlock
