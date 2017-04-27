// @flow
import React, { Component } from 'react';
import { timeCode } from '../../common/time-code';
import classNames from 'classnames';

import type { CssPixels, DevicePixels, NonNull } from '../../common/types/units';

type HoveredItem = NonNull;

type Props = {
  containerWidth: CssPixels,
  containerHeight: CssPixels,
  className: string,
  onDoubleClickItem: HoveredItem => void,
  getHoveredItemInfo: HoveredItem => string,
  drawCanvas: (CanvasRenderingContext2D, HoveredItem) => void,
  hitTest: (x: CssPixels, y: CssPixels) => null | HoveredItem,
};

require('./TimelineCanvas.css');

export default class TimelineCanvas extends Component {

  props: Props
  _requestedAnimationFrame: boolean
  _devicePixelRatio: 1
  _ctx: CanvasRenderingContext2D
  state: {
    hoveredItem: null | HoveredItem;
  }

  constructor(props: Props) {
    super(props);
    this._requestedAnimationFrame = false;
    this._devicePixelRatio = 1;
    this.state = { hoveredItem: null };

    (this: any).onMouseMove = this.onMouseMove.bind(this);
    (this: any).onMouseOut = this.onMouseOut.bind(this);
    (this: any).onDoubleClick = this.onDoubleClick.bind(this);
    (this: any).getHoveredItemInfo = this.getHoveredItemInfo.bind(this);
  }

  shouldComponentUpdate() {
    // If the parent updates, always re-render.
    return true;
  }

  _scheduleDraw() {
    const { className, drawCanvas } = this.props;
    if (!this._requestedAnimationFrame) {
      this._requestedAnimationFrame = true;
      window.requestAnimationFrame(() => {
        this._requestedAnimationFrame = false;
        if (this.refs.canvas) {
          timeCode(`${className} render`, () => {
            this._prepCanvas();
            drawCanvas(this._ctx, this.state.hoveredItem);
          });
        }
      });
    }
  }

  _prepCanvas() {
    const {canvas} = this.refs;
    const {containerWidth, containerHeight} = this.props;
    const {devicePixelRatio} = window;
    const pixelWidth: DevicePixels = containerWidth * devicePixelRatio;
    const pixelHeight: DevicePixels = containerHeight * devicePixelRatio;
    if (!this._ctx) {
      this._ctx = canvas.getContext('2d');
    }
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = containerWidth + 'px';
      canvas.style.height = containerHeight + 'px';
      this._ctx.scale(this._devicePixelRatio, this._devicePixelRatio);
    }
    if (this._devicePixelRatio !== devicePixelRatio) {
      // Make sure and multiply by the inverse of the previous ratio, as the scaling
      // operates off of the previous set scale.
      const scale = (1 / this._devicePixelRatio) * devicePixelRatio;
      this._ctx.scale(scale, scale);
      this._devicePixelRatio = devicePixelRatio;
    }
    return this._ctx;
  }

  onMouseMove(event: SyntheticMouseEvent) {
    const { canvas } = this.refs;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x: CssPixels = event.pageX - rect.left;
    const y: CssPixels = event.pageY - rect.top;

    const maybeHoveredItem = this.props.hitTest(x, y);
    if (maybeHoveredItem !== this.state.hoveredItem) {
      this.setState({ hoveredItem: maybeHoveredItem });
    }
  }

  onMouseOut() {
    if (this.state.hoveredItem !== null) {
      this.setState({ hoveredItem: null });
    }
  }

  onDoubleClick() {
    const { hoveredItem } = this.state;
    if (hoveredItem === null) {
      return;
    }
    this.props.onDoubleClickItem(hoveredItem);
  }

  getHoveredItemInfo(): null | string {
    const { hoveredItem } = this.state;
    if (hoveredItem === null) {
      return null;
    }
    return this.props.getHoveredItemInfo(hoveredItem);
  }

  render() {
    const { hoveredItem } = this.state;
    this._scheduleDraw();

    const className = classNames({
      timelineCanvas: true,
      [this.props.className]: true,
      hover: hoveredItem !== null,
    });

    return <canvas className={className}
                   ref='canvas'
                   onMouseMove={this.onMouseMove}
                   onMouseOut={this.onMouseOut}
                   onDoubleClick={this.onDoubleClick}
                   title={this.getHoveredItemInfo()} />;
  }
}