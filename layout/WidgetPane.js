define([
	"dojo/text!./templates/WidgetPane.html",
	"dojo/_base/array",
	"dojo/_base/declare", // declare
	"dojo/_base/lang",
	"dojo/_base/connect",
	"dojo/dom", // dom.setSelectable
	"dojo/dom-class", // domClass.replace
	"dojo/dom-style", // domClass.replace
	"dojo/fx", // fxUtils.wipeIn fxUtils.wipeOut
	"dijit/_base/manager",	// defaultDuration
	"dijit/layout/StackContainer",
	"dijit/_CssStateMixin",
	"dijit/_TemplatedMixin"
], function(template, array, declare, lang, connect, dom, domClass, domStyle, fxUtils, manager, StackContainer, _TemplatedMixin, _CssStateMixin){
  return declare("wDojo.dijit.WidgetPane", [StackContainer, _TemplatedMixin, _CssStateMixin],
	{
        // title: String
        //      Title of the pane
        title: "",

        // open: Boolean
        //      Whether pane is opened or closed.
        open: true,

        // duration: Integer
        //      Time in milliseconds to fade in/fade out
        duration: manager.defaultDuration,

        // baseClass: [protected] String
        //      The root className to use for the various states of this widget
        baseClass: "widgetTitlePane",

        templateString: template,
        
		_setTitleAttr: { node: "titleNode", type: "innerHTML" },	// override default where title becomes a hover tooltip
		
		/*
        attributeMap: dojo.delegate(dijit.layout.ContentPane.prototype.attributeMap, {
            title: { node: "titleNode", type: "innerHTML" },
            extraTitle: { node: "extraTitleNode", type: "innerHTML" }
        }),
*/
        // closable: Boolean
        //      Allow closure of this Node
        closable: true,
        pageable: true,
        configable: true,

		buildRendering: function(){
		  this.inherited(arguments);
		  dom.setSelectable(this.titleNode, false);
		},
		
        postCreate: function(){
            console.debug("widgetPane::postCreate");
            if(!this.open){
                this.hideNode.style.display = this.wipeNode.style.display = "none";
            }
            this._setWipeArrowCss();
            
            // setup open/close animations
            var hideNode = this.hideNode, wipeNode = this.wipeNode;
            this._wipeIn = fxUtils.wipeIn({
                node: wipeNode,
                duration: this.duration,
                beforeBegin: function(){
                    hideNode.style.display="";
                }
            });
            this._wipeOut = fxUtils.wipeOut({
                node: wipeNode,
                duration: this.duration,
                onEnd: function(){
                    hideNode.style.display="none";
                }
            });
            if(!this.pageable){ this.footerNode.style.display = "none"; }
            if(!this.closable){ this.closeNode.style.display = "none"; }
            if(!this.configable){ this.configNode.style.display = "none"; }
        
            this._buildMainPane();
            this._buildConfigPane();
			
			this.nextNodeInner.innerHTML = "->";
			this.previousNodeInner.innerHTML = "<-";
			
            this.inherited(arguments);
        },

        layout: function() {
            // summary:
            //      Temporary fix to prevent infinite loop on resize event.
            //      The resize action is triggerred in dijit.layout._LayoutWidget class.
            console.log("WidgetPane::layout");
        	if (dojo.isIE) {        		
        		var newViewport = dijit.getViewport();
	            if(this._viewport===undefined || newViewport.w != this._viewport.w ||  newViewport.h != this._viewport.h){
	                this._viewport = newViewport;
	                this.inherited(arguments);
	            }
        	} else {
        		this.inherited(arguments);
        	}
        },

        _buildConfigPane: function(){

        },
        _buildMainPane: function(){

        },

        _setOpenAttr: function(/* Boolean */ open){
            // summary:
            //      Hook to make attr("open", boolean) control the open/closed state of the pane.
            // open: Boolean
            //      True if you want to open the pane, false if you want to close it.
            console.log("WidgetPane::_setOpenAttr");
            if(this.open !== open){ this.toggle(); }
        },

        close: function(){
            // summary: Close and destroy this widget
            if(!this.closable){ return; }
            connect.unsubscribe(this._listener);
            this.hide(lang.hitch(this, function(){
                this.destroyRecursive();
            }));
        },
        hide: function(/* Function? */ callback){
            // summary: Close, but do not destroy this FloatingPane
            dojo.fadeOut({
                node:this.domNode,
                duration:this.duration,
                onEnd: lang.hitch(this, function() {
                    this.domNode.style.display = "none";
                    this.domNode.style.visibility = "hidden";
                    if(callback){
                        callback();
                    }
                })
            }).play();
        },

        _transition: function(/*Widget*/newWidget, /*Widget*/oldWidget){
            // summary:
            //      Hide the old widget and display the new widget.
            //      Subclasses should override this.
            // tags:
            //      protected extension
            console.log("WidgetPane::_transition");
            domStyle.set(newWidget.domNode, "opacity", 0);
            fxUtils.chain([
                    dojo.fadeOut({
                        node:oldWidget.domNode,
                        duration:this.duration,
                        onEnd: dojo.hitch(this, "_hideChild", oldWidget)
                    }),
                    dojo.fadeIn({
                        node: newWidget.domNode,
                        duration:this.duration,
                        onBegin: dojo.hitch(this, "_showChild", newWidget),
                        onPlay: this._onTransition
//                        onEnd: this._onTransition
                    })
                ]

            ).play();
            
            if(this.doLayout && newWidget.resize){
                console.log("_transition: class resize", newWidget);
                newWidget.resize(this._containerContentBox || this._contentBox);
            }
        },

        _onTransition: function(){
		// summary:
		//		Event hook, is called when transition animation id started
        //      is intended for Datagrid sorting.
		// tags:
		//		callback
        },

        _showChild: function(page){
            // summary: show the specified child widget
            this.inherited(arguments);
            if(this.pageable){
                if(this._adjacentOfSameKind(true, page)){ this.footerNode.style.display = ""; }
                else{ this.footerNode.style.display = "none";}
            }
        },

        toggle: function(){
            // summary:
            //      Switches between opened and closed state
            // tags:
            //      private
            console.log("WidgetPane::toggle");
            this._stopWip();
            //console.debug("toggle");
            var anim = this[this.open ? "_wipeOut" : "_wipeIn"]
            if(anim){
                anim.play();
            }else{
                this.hideNode.style.display = this.open ? "" : "none";
            }
            this.open =! this.open;

            // load content (if this is the first time we are opening the TitlePane
            // and content is specified as an href, or href was set when hidden)
            this.selectedChildWidget._onShow();

            this._setWipeArrowCss();
        },
        _stopWip: function(){
            array.forEach([this._wipeIn, this._wipeOut], function(animation){
                if(animation && animation.status() == "playing"){
                    animation.stop();
                }
            });
        },
        
        isConfigMode: function(){
            return this.selectedChildWidget && domClass.contains(this.selectedChildWidget.domNode, "widgetSettingsPane");
        },
        toggleEdit: function(){
            // summary:
            //      Switches between opened and closed state
            this._stopWip();
            var classToSearch = this.isConfigMode() ? "widgetMainPane" : "widgetSettingsPane";
            var arr = this.getChildren();
            for(var i=0,l=arr.length; i<l; ++i){
                var child = arr[i];
                if(domClass.contains(child.domNode, classToSearch)){
                    if(classToSearch == "widgetSettingsPane"){
						domClass.replace(this.configNode, "configOff", "configOn");
                    }else{
						domClass.replace(this.configNode, "configOn", "configOff");
                    }
                    this.selectChild(child);
                    break;
                }
            }
            
        },

        _selectAdjacentOfSameKind: function(/*Boolean*/ forward){
            var child = this._adjacentSameKind(forward);
            this.selectChild(child);
        },
        _adjacentSameKind: function(/*Boolean*/ forward){
            return this._adjacentOfSameKind(forward, this.selectedChildWidget);
        },
        _adjacentOfSameKind: function(/*Boolean*/ forward, /*widget*/ fromChild){
            var classToSearch = fromChild && domClass.contains(fromChild.domNode, "widgetSettingsPane") ? "widgetSettingsPane": "widgetMainPane";
            var childrens = this.getChildren();
            var previousChild = fromChild;
            for(var i=1,l=childrens.length; i<l; ++i){
                child = this.adjacentOf(forward, childrens, previousChild);
//                console.debug("next to "+child.id);
                if(domClass.contains(child.domNode, classToSearch)){
                    //console.debug("found other same kind ("+classToSearch+"), previous "+fromChild.id+" to child "+child.id);
                    return child;
                }
                previousChild = child;
            }
        },
        previousPane: function(){
            this._selectAdjacentOfSameKind(false);
        },
        nextPane: function(){
            this._selectAdjacentOfSameKind(true);
        },
        _setWipeArrowCss: function(){
            // summary:
            //      Set the open/close css state for the TitlePane
            // tags:
            //      private
			console.log("WidgetPane::_setWipeArrowCss");
            var classes = ["dijitClosed", "dijitOpen"];
            var boolIndex = this.open;
            var node = this.titleBarNode || this.focusNode;
            domClass.remove(node, classes[!boolIndex+0]);
            node.className += " " + classes[boolIndex+0];

            // provide a character based indicator for images-off mode
            this.arrowNodeInner.innerHTML = this.open ? "-" : "+";
        },

        _onTitleKey: function(/*Event*/ e){
            // summary:
            //      Handler for when user hits a key
            // tags:
            //      private

            if(e.charOrCode == dojo.keys.ENTER || e.charOrCode == ' '){
                this.toggle();
            }else if(e.charOrCode == dojo.keys.DOWN_ARROW && this.open){
                this.containerNode.focus();
                e.preventDefault();
            }
        },

        _onTitleEnter: function(){
            // summary:
            //      Handler for when someone hovers over my title
            // tags:
            //      private
            domClass.add(this.focusNode, "dijitTitlePaneTitle-hover");
        },

        _onTitleLeave: function(){
            // summary:
            //      Handler when someone stops hovering over my title
            // tags:
            //      private
            domClass.remove(this.focusNode, "dijitTitlePaneTitle-hover");
        },

        _handleFocus: function(/*Event*/ e){
            // summary:
            //      Handle blur and focus for this widget
            // tags:
            //      private

            // add/removeClass is safe to call without hasClass in this case
            dojo[(e.type == "focus" ? "addClass" : "removeClass")](this.focusNode, this.baseClass + "Focused");
        },

        refreshDisplay: function(){
            // summary:
            //      Check if the selected child Widget has DataGrid to update display.
            var parent =  this.domNode.parentNode;
            var hasClass = false;
            while(parent){
                 hasClass = domClass.contains(parent, "dijitHidden");
                 if(hasClass)break;
                 parent = parent.parentNode;
            }
            if(!hasClass){
                this._refreshDisplay(true);
            }
         },
         _refreshDisplay: function(update){
            console.log("internal display "+update);
         },

        _refreshAfterDnd: function(source, nodes, copy, target){
            // summary:
            //      Check if the Widget change container after a Dnd.
            if (lang.isArray(nodes) && nodes[0].id==this.id && target!=source) {
                this._refreshDisplay();
            }
        },
        
        adjacentOf: function(/*Boolean*/ forward, /*list*/ children, /*widget*/ child){
		  // summary:
		  //      Gets the next/previous child widget in the given list.
		  var index = dojo.indexOf(children, child);
		  index += forward ? 1 : children.length - 1;
		  return children[ index % children.length ]; // dijit._Widget
		}
    });
});
