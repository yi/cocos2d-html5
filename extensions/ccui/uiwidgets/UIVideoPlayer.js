/****************************************************************************
 Copyright (c) 2013-2014 Chukong Technologies Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

ccui.VideoPlayer = ccui.Widget.extend({

    _EventList: null,

    ctor: function(path){
        ccui.Widget.prototype.ctor.call(this);
        if(path)
            this.setURL(path);

        this._EventList = {};//play | pause | stop | complete
    },

    _createRenderCmd: function(){
        return new ccui.VideoPlayer.RenderCmd(this);
    },

    /**
     * Set the video address
     * Automatically replace extname
     * All supported video formats will be added to the video
     * @param {String} path
     */
    setURL: function(path){
        this._renderCmd.updateURL(path);
    },

    /**
     * Get the video path
     * @returns {String}
     */
    getURL: function() {
        var video = this._renderCmd._video;
        if (video) {
            var source = video.getElementsByTagName("source");
            if (source && source[0])
                return source[0].src;
        }

        return "";
    },

    /**
     * Set the video address
     * Automatically replace extname
     * All supported video formats will be added to the video
     * @param {String} path
     */
    setFileName: function(path){
        this.setURL(path);
    },

    /**
     * Get the video path
     * @returns {String}
     */
    getFileName: function(){
        this.getURL(path);
    },

    /**
     * Play the video
     */
    play: function(){
        var video = this._renderCmd._video;
        if(video)
            video.play();
    },

    /**
     * Pause the video
     */
    pause: function(){
        var video = this._renderCmd._video;
        if(video)
            video.pause();
    },

    /**
     * Resume the video
     */
    resume: function(){
        var video = this._renderCmd._video;
        if(video)
            video.play();
    },

    /**
     * Stop the video
     */
    stop: function(){
        var self = this,
            video = self._renderCmd._video;
        if(video){
            video.pause();
            video.currentTime = 0;
        }

        setTimeout(function(){
            var list = self._EventList["stop"];
            if(list)
                for(var i=0; i<list.length; i++)
                    list[i].call(self);
        }, 0);
    },
    /**
     * Jump to the specified point in time
     * @param {Number} sec
     */
    seekTo: function(sec){
        var video = this._renderCmd._video;
        if(video){
            video.currentTime = sec;
        }
    },

    /**
     * Whether the video is playing
     * @returns {boolean}
     */
    isPlaying: function(){
        var video = this._renderCmd._video;
        if(video && video.paused === false)
                return true;
        return false;
    },

    /**
     * Whether to keep the aspect ratio
     */
    setKeepAspectRatioEnabled: function(enable){
        cc.log("On the web is always keep the aspect ratio");
    },
    isKeepAspectRatioEnabled: function(){
        return true;
    },

    setFullScreenEnabled: function(enable){
        var video = this._renderCmd._video;
        if(video)
            cc.screen.requestFullScreen(video);
    },
    isFullScreenEnabled: function(){
        cc.log("Can't know status");
    },

    /**
     *
     * @param {String} event play | pause | stop | complete
     * @param {Function} callback
     */
    addEventListener: function(event, callback){
        var list = this._EventList;
        if(!list[event])
            list[event] = [];

        list[event].push(callback);
    },

    /**
     *
     * @param {String} event play | pause | stop | complete
     * @param {Function} callback
     */
    removeEventListener: function(event, callback){
        var list = this._EventList, item = list[event];
        if(item){
            for(var i=0; i<item.length; i++){
                if(item[i] === callback){
                    item.splice(i, 1);
                    break;
                }
            }
            if(item.length === 0)
                delete list[event];
        }
    },

    onPlayEvent: function(event){
        var list = this._EventList[event];
        if(list)
            for(var i=0; i<list.length; i++)
                list[i].call(this);
    },

    //_createCloneInstance: function(){},
    //_copySpecialProperties: function(){},

    setContentSize: function(w, h){
        ccui.Widget.prototype.setContentSize.call(this, w, h);
        if(h === undefined){
            h = w.height;
            w = w.width;
        }
        this._renderCmd.changeSize(w, h);
    },

    cleanup: function(){
        this._renderCmd.removeDom();
        this.stopAllActions();
        this.unscheduleAllCallbacks();
    }

});

(function(video){
    /**
     * Adapter various machines
     * @devicePixelRatio Whether you need to consider devicePixelRatio calculated position
     * @event To get the data using events
     */
    video.polyfill = {
        devicePixelRatio: false,
        event: "canplay",
        canPlayType: []
    };

    (function(){
        var dom = document.createElement("video");
        if(dom.canPlayType("video/ogg"))
            video.polyfill.canPlayType.push(".ogg");
        if(dom.canPlayType("video/mp4"))
            video.polyfill.canPlayType.push(".mp4");
    })();

    if(cc.sys.OS_IOS === cc.sys.os){
        video.polyfill.devicePixelRatio = true;
        video.polyfill.event = "progress";
    }

})(ccui.VideoPlayer);

(function(polyfill){
    ccui.VideoPlayer.RenderCmd = function(node){
        cc.Node.CanvasRenderCmd.call(this, node);
        this._video = document.createElement("video");
        //this._video.controls = "controls";
        this._video.preload = "metadata";
        this._video.style["visibility"] = "hidden";
        this._loaded = false;
        this.initStyle();
    };

    var proto = ccui.VideoPlayer.RenderCmd.prototype = Object.create(cc.Node.CanvasRenderCmd.prototype);
    proto.constructor = ccui.VideoPlayer.RenderCmd;

    proto.visit = function(){
        var container = cc.container;
        if(this._node._visible){
            container.appendChild(this._video);
            cc.view._addResizeCallback(this.resize, this);
        }else{
            var hasChild = false;
            if('contains' in container) {
                hasChild = container.contains(this._video);
            }else {
                hasChild = container.compareDocumentPosition(this._video) % 16;
            }
            if(hasChild)
                container.removeChild(this._video);
            cc.view._removeResizeCallback(this.resize, this);
        }
        this.updateStatus();
    };

    proto.updateStatus = function(){
        polyfill.devicePixelRatio = cc.view.isRetinaEnabled();
        var flags = cc.Node._dirtyFlags, locFlag = this._dirtyFlag;
        if(locFlag & flags.transformDirty){
            //update the transform
            this.transform(this.getParentRenderCmd(), true);
            this.updateMatrix(this._worldTransform, cc.view._scaleX, cc.view._scaleY);
            this._dirtyFlag = this._dirtyFlag & cc.Node._dirtyFlags.transformDirty ^ this._dirtyFlag;
        }
    };

    proto.resize = function(view){
        var node = this._node;
        if(node._parent && node._visible)
            this.updateMatrix(this._worldTransform, view._scaleX, view._scaleY);
        else
            cc.view._removeResizeCallback(this.resize, this);
    };

    proto.updateMatrix = function(t, scaleX, scaleY){
        var node = this._node;
        if(polyfill.devicePixelRatio){
            var dpr = window.devicePixelRatio;
            scaleX = scaleX / dpr;
            scaleY = scaleY / dpr;
        }
        if(this._loaded === false) return;
        //var clientWidth = node._contentSize.width,
        //    clientHeight = node._contentSize.height;
        //var ax = clientWidth*node._scaleX,
        //    ay = clientHeight*node._scaleY;
        var cx = this._anchorPointInPoints.x,
            cy = this._anchorPointInPoints.y;
        var cw = node._contentSize.width,
            ch = node._contentSize.height;
        var a = t.a * scaleX,
            b = t.b,
            c = t.c,
            d = t.d * scaleY,
            tx = t.tx - cw/2 + cw*node._scaleX/2,
            ty = t.ty - ch/2 + ch*node._scaleY/2;
            //tx =  (t.tx + ax*node._scaleX)*scaleX - (1-scaleX)*clientWidth/2 - (clientWidth - ax)*scaleX,
            //ty = (t.ty + ay*node._scaleX)*scaleY - (1-scaleY)*clientHeight/2 - (clientHeight - ay)*scaleY;
        var matrix = "matrix(" + a + "," + b + "," + c + "," + d + "," + tx + "," + -ty + ")";
        this._video.style["transform"] = matrix;
        this._video.style["-webkit-transform"] = matrix;
    };

    proto.updateURL = function(path){
        var video = this._video;
        var source = document.createElement("source");
        source.src = path;
        video.appendChild(source);
        var extname = cc.path.extname(path);
        for(var i=0; i<polyfill.canPlayType.length; i++){
            if(extname !== polyfill.canPlayType[i]){
                source = document.createElement("source");
                source.src = path.replace(extname, polyfill.canPlayType[i]);
                video.appendChild(source);
            }
        }
        var self = this;

        var cb = function(){
            self._loaded = true;
            self.setDirtyFlag(cc.Node._dirtyFlags.transformDirty);
            self.changeSize(0, 0);
            video.removeEventListener(polyfill.event, cb);
            video.style["visibility"] = "visible";
            //IOS does not display video images
            video.play();
            video.currentTime = 0;
            video.pause();
            video.currentTime = 0;
            setTimeout(function(){
                self.bindEvent();
            }, 0);
        };
        video.addEventListener(polyfill.event, cb);
    };

    proto.bindEvent = function(){
        var node = this._node,
            video = this._video;
        //binding event
        video.addEventListener("ended", function(){
            var list = node._EventList["complete"];
            if(list)
                for(var i=0; i<list.length; i++)
                    list[i].call(node);
        });
        video.addEventListener("play", function(){
            var list = node._EventList["play"];
            if(list)
                for(var i=0; i<list.length; i++)
                    list[i].call(node);
        });
        video.addEventListener("pause", function(){
            var list = node._EventList["pause"];
            if(list)
                for(var i=0; i<list.length; i++)
                    list[i].call(node);
        });
    };

    proto.initStyle = function(){
        if(!this._video)  return;
        var video = this._video;
        video.style.position = "absolute";
        video.style.bottom = "0px";
        video.style.left = "0px";
    };

    proto.changeSize = function(w, h){
        var video = this._video;
        if(video){
            if(w !== undefined && w !== 0)
                video.width = w;
            if(h !== undefined && h !== 0)
                video.height = h;
        }
    };

    proto.removeDom = function(){
        var video = this._video;
        if(video){
            var hasChild = false;
            if('contains' in cc.container) {
                hasChild = cc.container.contains(video);
            }else {
                hasChild = cc.container.compareDocumentPosition(video) % 16;
            }
            if(hasChild)
                cc.container.removeChild(video);
        }
    };

})(ccui.VideoPlayer.polyfill);