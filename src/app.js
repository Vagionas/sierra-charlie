"use strict";

var GeometryLoader = require("./geometry-loader");
var Painter = require("./painter");
var Renderer = require("./renderer");

var r = require("react-wrapper");
var defs = require("./defs");
var easeStateMixin = require("./ease-state-mixin");


module.exports = {
  mixins: [
    easeStateMixin
  ],

  getInitialState: function () {
    return {
      attentionLeft: 0.4897637424698795,
      attentionTop: 0.4768826844262295,
      rawTimeValue: 10 + 9 / 60,
      zoomPower: 4,
      renderNotVisibleImages: process.env.NODE_ENV === "production"
    };
  },

  easeAttentionLeft: function (attentionLeft, duration) {
    this.pendingScrollX = true;
    this.easeState("attentionLeft", attentionLeft, duration, function () {
        this.pendingScrollX = false;
      }.bind(this));
  },
 
  easeAttentionTop: function (attentionTop, duration) {
    this.pendingScrollY = true;
    this.easeState("attentionTop", attentionTop, duration, function () {
        this.pendingScrollY = false;
      }.bind(this));
  },

  easeTimeValue: function (rawTimeValue, duration) {
    this.pendingTimeChange = true;
    this.easeState("rawTimeValue", rawTimeValue, duration, function () {
        this.pendingTimeChange = false;
      }.bind(this));
  },

  easeZoomPower: function (zoomPower, duration) {
    this.pendingZoom = true;
    this.easeState("zoomPower", zoomPower, duration, function () {
        this.pendingZoom = false;
      }.bind(this));
  },


  _updateLoader: function () {
    this._geometryLoader.update({
        attentionLocalX: this.attentionLocalX,
        attentionLocalY: this.attentionLocalY
      });
  },

  _updateRenderer: function () {
    this._renderer.update({
        renderNotVisibleImages: this.state.renderNotVisibleImages,
        floorTimeValue:         this.floorTimeValue,
        floorZoomPower:         this.floorZoomPower,
        attentionLocalX:        this.attentionLocalX,
        attentionLocalY:        this.attentionLocalY,
        firstVisibleLocalX:     this.firstVisibleLocalX,
        lastVisibleLocalX:      this.lastVisibleLocalX,
        firstVisibleLocalY:     this.firstVisibleLocalY,
        lastVisibleLocalY:      this.lastVisibleLocalY
      });
  },
  
  _updatePainter: function () {
    this._painter.update({
        canvas:             this.canvas,
        clientWidth:        this.state.clientWidth,
        clientHeight:       this.state.clientHeight,
        invertColor:        this.state.invertColor,
        floorTimeValue:     this.floorTimeValue,
        roundZoomPower:     this.roundZoomPower,
        easedZoomPower:     this.easedZoomPower,
        easedZoomLevel:     this.easedZoomLevel,
        groupCount:         this.groupCount,
        groupSize:          this.groupSize,
        scrollLeft:         this.scrollLeft,
        scrollTop:          this.scrollTop,
        firstVisibleLocalX: this.firstVisibleLocalX,
        lastVisibleLocalX:  this.lastVisibleLocalX,
        firstVisibleLocalY: this.firstVisibleLocalY,
        lastVisibleLocalY:  this.lastVisibleLocalY,
        firstVisibleGroupX: this.firstVisibleGroupX,
        lastVisibleGroupX:  this.lastVisibleGroupX,
        firstVisibleGroupY: this.firstVisibleGroupY,
        lastVisibleGroupY:  this.lastVisibleGroupY
      });
  },

  onTileLoad: function (tileId, tileData) {
    this._updateRenderer();
    this._updatePainter();
  },
  
  onImageRender: function (imageId) {
    this._updatePainter();
  },

  componentDidMount: function () {
    this._geometryLoader = new GeometryLoader({
        onTileLoad: this.onTileLoad
      });
    this._renderer = new Renderer({
        getLoadedTile: this._geometryLoader.getLoadedTile.bind(this._geometryLoader),
        onImageRender: this.onImageRender
      });
    this._painter = new Painter({
        getRenderedGroup: this._renderer.getRenderedGroup.bind(this._renderer)
      });
    
    this.node = r.domNode(this);
    this.canvas = this.node.firstChild;
    this.node.addEventListener("scroll", this.onScroll);
    addEventListener("resize", this.onResize);
    addEventListener("keydown", this.onKeyDown);
    this.importClientSize();
    this.computeDerivedState();
    this.exportScrollPosition();
    this.exportBackgroundColor();
    this._updateLoader();
    this._updateRenderer();
    this._updatePainter();
  },

  componentWillUnmount: function () {
    this.node.removeEventListener("scroll", this.onScroll);
    removeEventListener("resize", this.onResize);
    removeEventListener("keydown", this.onKeyDown);
  },

  componentDidUpdate: function (prevProps, prevState) {
    this.computeDerivedState();
    this.exportScrollPosition();
    this.exportBackgroundColor(prevState);
    this._updateLoader();
    this._updateRenderer();
    this._updatePainter();
  },

  onScroll: function (event) {
    if (!this.pendingScrollX && !this.pendingScrollY && !this.pendingZoom) {
      this.importScrollPosition();
    }
  },

  onResize: function (event) {
    this.importClientSize();
  },


  importClientSize: function () {
    this.setState({
        clientWidth:  this.node.clientWidth,
        clientHeight: this.node.clientHeight
      });
  },

  importScrollPosition: function () {
    this.setState({
        attentionLeft: this.node.scrollLeft / this.easedWidth,
        attentionTop:  this.node.scrollTop / this.easedHeight
      });
  },

  // TODO: Refactor
  computeTimeValue: function (rawTimeValue) {
    return (
      rawTimeValue >= 0 ?
        Math.round((rawTimeValue * 3600) % (24 * 3600)) / 3600 :
        24 - Math.round((-rawTimeValue * 3600) % (24 * 3600)) / 3600);
  },

  computeTimeSlice: function (timeValue) {
    return (
      (timeValue >=  8 && timeValue < 10) ? 1 :
      (timeValue >= 10 && timeValue < 13) ? 2 :
      (timeValue >= 13 && timeValue < 16) ? 3 :
      (timeValue >= 16 && timeValue < 19) ? 4 :
      (timeValue >= 19 && timeValue < 21) ? 5 :
      0);
  },

  computeDerivedState: function () {
    this.easedAttentionLeft = this.getEasedState("attentionLeft");
    this.easedAttentionTop  = this.getEasedState("attentionTop");
    this.easedTimeValue     = this.computeTimeValue(this.getEasedState("rawTimeValue"));
    this.easedZoomPower     = this.getEasedState("zoomPower");
    this.floorTimeValue = Math.floor(this.easedTimeValue);
    this.timeSlice      = this.computeTimeSlice(this.floorTimeValue);
    this.floorZoomPower = Math.floor(this.easedZoomPower);
    this.roundZoomPower = Math.round(this.easedZoomPower);
    this.ceilZoomPower  = Math.ceil(this.easedZoomPower);
    this.easedZoomLevel = Math.pow(2, this.easedZoomPower);
    this.easedImageSize = defs.imageSize / this.easedZoomLevel;
    this.groupCount     = Math.pow(2, this.roundZoomPower);
    this.groupSize      = defs.imageSize * this.groupCount;
    this.easedWidth     = defs.tileXCount * this.easedImageSize;
    this.easedHeight    = defs.tileYCount * this.easedImageSize;
    this.scrollLeft     = Math.floor(this.easedAttentionLeft * this.easedWidth - this.state.clientWidth / 2);
    this.scrollTop      = Math.floor(this.easedAttentionTop * this.easedHeight - this.state.clientHeight / 2);
    this.attentionLocalX    = Math.floor(this.easedAttentionLeft * defs.tileXCount);
    this.attentionLocalY    = Math.floor(this.easedAttentionTop * defs.tileYCount);
    this.firstVisibleLocalX = defs.clampLocalX(Math.floor(this.scrollLeft / this.easedImageSize));
    this.lastVisibleLocalX  = defs.clampLocalX(Math.floor((this.scrollLeft + this.state.clientWidth - 1) / this.easedImageSize));
    this.firstVisibleLocalY = defs.clampLocalY(Math.floor(this.scrollTop / this.easedImageSize));
    this.lastVisibleLocalY  = defs.clampLocalY(Math.floor((this.scrollTop + this.state.clientHeight - 1) / this.easedImageSize));
    this.firstVisibleGroupX = Math.floor(this.firstVisibleLocalX / this.groupCount) * this.groupCount;
    this.lastVisibleGroupX  = Math.floor(this.lastVisibleLocalX / this.groupCount) * this.groupCount;
    this.firstVisibleGroupY = Math.floor(this.firstVisibleLocalY / this.groupCount) * this.groupCount;
    this.lastVisibleGroupY  = Math.floor(this.lastVisibleLocalY / this.groupCount) * this.groupCount;
  },

  exportScrollPosition: function () {
    this.node.scrollLeft = Math.floor(this.easedAttentionLeft * this.easedWidth);
    this.node.scrollTop  = Math.floor(this.easedAttentionTop * this.easedHeight);
  },

  exportBackgroundColor: function (prevState) {
    if (!prevState || prevState.invertColor !== this.state.invertColor) {
      document.body.style.backgroundColor = (
        !this.state.invertColor ?
          defs.backgroundColor :
          defs.inverseBackgroundColor);
    }
  },


  onKeyDown: function (event) {
    // console.log("keyDown", event.keyCode);
    var pageWidth  = 1 / (this.easedWidth / this.state.clientWidth);
    var pageHeight = 1 / (this.easedHeight / this.state.clientHeight);
    var delay = event.shiftKey ? 2500 : 500;
    var timeDelta = (event.ctrlKey || event.altKey) ? 60 : 3600;
    var zoomDelta = (event.altKey || event.ctrlKey) ? 2 : 10;
    switch (event.keyCode) {
      case 37: // left
      case 36: // home
        var left = this.state.attentionLeft - pageWidth / (event.keyCode === 36 ? 1 : 10);
        this.easeAttentionLeft(Math.max(0, left), delay);
        break;
      case 39: // right
      case 35: // end
        var left = this.state.attentionLeft + pageWidth / (event.keyCode === 35 ? 1 : 10);
        this.easeAttentionLeft(Math.min(left, 1), delay);
        break;
      case 38: // up
      case 33: // page up
        var top = this.state.attentionTop - pageHeight / (event.keyCode === 33 ? 1 : 10);
        this.easeAttentionTop(Math.max(0, top), delay);
        break;
      case 40: // down
      case 34: // page down
        var top = this.state.attentionTop + pageHeight / (event.keyCode === 34 ? 1 : 10);
        this.easeAttentionTop(Math.min(top, 1), delay);
        break;
      case 219: // left bracket
        var rawTimeValue = (Math.round((this.state.rawTimeValue * 3600) - timeDelta) / 3600);
        this.easeTimeValue(rawTimeValue, delay);
        break;
      case 221: // right bracket
        var rawTimeValue = (Math.round((this.state.rawTimeValue * 3600) + timeDelta) / 3600);
        this.easeTimeValue(rawTimeValue, delay);
        break;
      case 187: // plus
        var zoomPower = Math.max(0, (Math.round((this.state.zoomPower * 10) - zoomDelta) / 10));
        this.easeZoomPower(zoomPower, delay);
        break;
      case 189: // minus
        var zoomPower = Math.min(Math.round((this.state.zoomPower * 10) + zoomDelta) / 10, defs.maxZoomPower);
        this.easeZoomPower(zoomPower, delay);
        break;
      // case 67: // c
      //   this.setState({
      //       invertColor: !this.state.invertColor
      //     });
      //   break;
      case 70: // f
        this._renderer.reset();
        this._updateRenderer();
        break;
      case 82: // r
        this.setState({
            renderNotVisibleImages: !this.state.renderNotVisibleImages
          });
        break;
      default:
        if (event.keyCode >= 49 && event.keyCode <= 56) {
          this.easeZoomPower(event.keyCode - 49, delay);
        }
    }
  },

  onDoubleClick: function (event) {
    // console.log("doubleClick", event.clientX, event.clientY);
    var delay = !event.shiftKey ? 500 : 2500;
    var left = (this.scrollLeft + event.clientX) / this.easedWidth;
    var top  = (this.scrollTop + event.clientY) / this.easedHeight;
    this.easeAttentionLeft(Math.max(0, Math.min(left, 1)), delay);
    this.easeAttentionTop(Math.max(0, Math.min(top, 1)), delay);
    if (!event.altKey) {
      this.easeZoomPower(Math.max(0, this.state.zoomPower - 1), delay);
    } else {
      this.easeZoomPower(Math.min(this.state.zoomPower + 1, defs.maxZoomPower), delay);
    }
  },

  render: function () {
    return (
      r.div("map-frame",
        r.canvas("map-picture"),
        r.div({
            className: "map-space",
            style: {
              width:  this.easedWidth,
              height: this.easedHeight
            },
            onDoubleClick: this.onDoubleClick
          })));
  }
};

r.makeComponent("App", module);
