import { Component } from 'react';

export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { message: '' };
  }

  static getDerivedStateFromError(error) {
    return { message: error?.message || 'Page crash' };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (this.state.message) {
      return (
        <div className="bg-white border border-red-100 rounded-xl p-6 text-sm text-red-700">
          <p className="font-semibold mb-1">This page failed to open</p>
          <p className="text-red-600">{this.state.message}</p>
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-[#1a3a8a]"
            onClick={() => this.setState({ message: '' })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
