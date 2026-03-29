import * as React from 'react';

export class AppErrorBoundary extends React.Component {
   constructor(props) {
      super(props);
      this.state = { hasError: false };
   }

   static getDerivedStateFromError(error) {
      // Update state so the next render will show the fallback UI.
      console.log(`AppErrorBoundary - ${error}`);
      return { hasError: true };
   }

   componentDidCatch(error, info) {
      console.log(info);
   }

   render() {
      if (this.state.hasError) {
         // You can render any custom fallback UI
         return this.props.fallback || [];
      }

      return this.props.children;
   }
}

export default AppErrorBoundary
