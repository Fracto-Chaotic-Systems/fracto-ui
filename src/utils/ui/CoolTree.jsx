import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Tree from 'rc-tree';

import "rc-tree/assets/index.css"
import CoolStyles from "common/ui/styles/CoolStyles";

export class CoolTree extends Component {

   static propTypes = {
      data: PropTypes.elementType.isRequired,
      on_select: PropTypes.func,
      on_expand: PropTypes.func,
      selected_keys: PropTypes.array.isRequired,
      expanded_keys: PropTypes.array.isRequired,
   }

   static on_expand_noop = () => {
      console.log('on_expand not yet supported')
   }

   static on_select_noop = () => {
      console.log('on_select not yet supported')
   }

   static defaultProps = {
      on_expand: CoolTree.on_expand_noop, on_select: CoolTree.on_select_noop,
   }

   state = {
      tree_ref: React.createRef(), parent_bounds: null,
   }

   componentDidMount() {
      const {tree_ref} = this.state
      const parent_element = tree_ref.current.parentElement
      const parent_bounds = parent_element.getBoundingClientRect()
      this.setState({parent_bounds})
   }

   render() {
      const {tree_ref, parent_bounds} = this.state
      const {data, on_select, on_expand, expanded_keys, selected_keys} = this.props
      const wrapper_style = {
         width: `${parent_bounds?.width - 10}px`, height: `${parent_bounds?.height - 50}px`
      }
      return <CoolStyles.Block
         style={wrapper_style}
         ref={tree_ref}>
         <Tree
            // style={wrapper_style}
            treeData={[data]}
            onSelect={on_select}
            onExpand={on_expand}
            showLine={true}
            expandedKeys={expanded_keys}
            selectedKeys={selected_keys}
         />
      </CoolStyles.Block>
   }
}

export default CoolTree;