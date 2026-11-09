function pretius_apex_resize_modal(p_ref, p_pageObject){
  window.parent.dialogIframeLoaded( p_pageObject );
}

function prepareParent(p_ref) {

  function isDialogPluginInstance( event ){
    //var result = window.pamr == undefined || $(event.target).dialog('widget') != window.pamr.dialog.widget ? false : true;
    var result = window.pamr.dialog == undefined ? false : true;
/*
    console.log( 'isDialogPluginInstance = '+result );
    console.log( $(event.target).dialog('widget') );
    console.log( window.pamr.dialog.widget );
*/
    return result;
  }

  function getPxFromPercent( p_value ){
    return {
      'width':  ( $(window).outerWidth()  * (parseFloat( p_value )/100)).toFixed(0),
      'height': ( $(window).outerHeight() * (parseFloat( p_value )/100)).toFixed(0)
    }
  }

  function debounce(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  };

  function redrawDialog() {
    console.log('redrawDialog');
    var attr = null;

    if ( window.pamr == undefined )
      return void(0);

/*
    if ( pamr.dialog.percent_width ) {
      try{
        window.pamr.sizeAfterAnimation.width = getPxFromPercent( pamr.dialog.modalAttributesObj.dialog_width ).width;
        window.pamr.positionAfterDrag.width = getPxFromPercent( pamr.dialog.modalAttributesObj.dialog_width ).width;
      } catch(error) {
        console.log(error);
      }
    }

    if ( pamr.dialog.percent_height ) {
      try{
        window.pamr.sizeAfterAnimation.height = getPxFromPercent( pamr.dialog.modalAttributesObj.dialog_height ).height;
        window.pamr.positionAfterDrag.height = getPxFromPercent( pamr.dialog.modalAttributesObj.dialog_height ).height;

      } catch(error) {
        console.log(error);        
      }
    } 
*/
    switch( window.pamr.lastInteration ) {
      case 'animate':
        attr = window.pamr.sizeAfterAnimation;
        //moze byc wartosc procentowa
        break;
      case 'drag':
        attr = window.pamr.positionAfterDrag;
        //moze byc wartośc procestowa
        break;
      case 'resize':
        attr = window.pamr.sizeAfterResize;
        break;
      default:
        throw 'Error in fixing dialog box';
    }

    (window.pamr.dialog.body).dialog('option', attr);
    (window.pamr.dialog.widget).addClass('pamr-container').css(attr);
  }

  window.pamr = {};
  window.pamr.pluginAction = p_ref.action;

  //
  // dialogIframeLoaded
  //
  window.dialogIframeLoaded = function( modalAttributesObj ) {
    //pamrLog();
    if ( window.listenToWindowResizeFlag == undefined ) {
      window.listenToWindowResizeFlag = true;
      $( window ).resize(debounce(window.listenToWindowResize, 350));
    }

    pamr.dialog.modalAttributesObj = modalAttributesObj;
      

    //reset resize
    /*
    window.pamr.sizeAfterResize = undefined;
    window.pamr.positionAfterDrag = undefined;
    window.pamr.lastInteration = undefined;
    */

    //auto znaczy ze nie byla podana wartość wiec zostanie uzyta domyslna wartosc
    if ( modalAttributesObj.dialog_height == 'auto' ) {
      modalAttributesObj.dialog_height = 500;//window.pamr.sizeOnOpen.height;//$(window.pamr.dialog.widget).outerHeight();
    }

    if ( modalAttributesObj.dialog_width == 'auto' ) {
      modalAttributesObj.dialog_width = 720;//window.pamr.sizeOnOpen.width;//$(window.pamr.dialog.widget).outerWidth();
    }

    var 
      windowSize = {
        'width': $(window).outerWidth(),
        'height': $(window).outerHeight()
      },
      currentSize = {

      },
      modalMaxWidth = modalAttributesObj.dialog_max_width.length > 0 ? modalAttributesObj.dialog_max_width : windowSize.width,
      destSize = {
        width: modalAttributesObj.dialog_width,
        height: modalAttributesObj.dialog_height
      },

      resizeSpeed = parseInt(window.pamr.pluginAction.attribute02),

      destPosition = {};

    //jeśli podano procenty oblicz pixele
    if ( typeof modalAttributesObj.dialog_width != 'number' && (modalAttributesObj.dialog_width).indexOf('%') > -1) {
      destSize.width = getPxFromPercent( modalAttributesObj.dialog_width ).width; 
      pamr.dialog.percent_width = true;
    }
      
    
    if ( typeof modalAttributesObj.dialog_height != 'number' && (modalAttributesObj.dialog_height).indexOf('%') > -1) {
      destSize.height = getPxFromPercent( modalAttributesObj.dialog_height ).height;
      pamr.dialog.percent_height = true;
    }
      

    //jeśli modal był przesuniety
    if ( window.pamr.positionAfterDrag != undefined ) {

      destPosition = {
        top: window.pamr.positionAfterDrag.top,
        left: window.pamr.positionAfterDrag.left
      };
    } else {
      destPosition = {
        top: (windowSize.height - destSize.height) / 2,
        left: (windowSize.width - destSize.width) / 2
      };

    }
    

    window.pamr.dialog.widget.animate({
      width: destSize.width,
      height: destSize.height,
      top: destPosition.top,
      left: destPosition.left//,
      //opacity: 1
    },{
      duration: resizeSpeed,
      step: function(now, fx){
        var 
          body = window.pamr.dialog.body,
          iframe = window.pamr.dialog.iframe,
          header = window.pamr.dialog.header,
          childrenToAnimate = (body.add(iframe));

        if ( fx.prop == 'width' ) {
          childrenToAnimate.css('width', now);
        }
        else if ( fx.prop == 'height' ) {
          childrenToAnimate.css('height', now-header.outerHeight());
        }
        
      }, //step
      complete: function(){
        var modalAttributes = {};
        
        window.pamr.sizeAfterAnimation = {
          width: destSize.width,
          height: destSize.height,
          top: destPosition.top,
          left: destPosition.left

        };

        if ( modalAttributesObj.dialog_attributes.length > 0 ) {
          try {
            modalAttributes = modalAttributesObj.dialog_attributes
            modalAttributes = '"'+modalAttributes.replace(/\s/g, '').replace(/,/g, ',"').replace(/:/g, '":');
            modalAttributes = JSON.parse('{'+modalAttributes+'}');
          } catch(error) {
            throw 'Modal attributes incorrect: '+error;
          }
        }

        modalAttributes.maxWidth = modalMaxWidth;
        modalAttributes.width = destSize.width;
        modalAttributes.height = destSize.height;
        modalAttributes.top = destPosition.top;
        modalAttributes.left = destPosition.left;

        (window.pamr.dialog.body).dialog('option', modalAttributes)
        //bo uciekal na top 0
        $(this).addClass('pamr-container').css(modalAttributes);
        window.pamr.lastInteration = 'animate';

      } //complete

    })  

  }

  //
  //
  //
  window.pamrLog = function() {
    console.log('pamrLog');
    console.log( window.pamr );
  }

  //uruchamiane przy kazdym kliknieciu w przycisk do modal w parent
  window.onDialogCreate = function(event, ui) {
    var 
      target = $(event.target),
      widget = target.dialog('widget');

    if ( !target.dialog('widget').is('.ui-dialog--apex') ) {
      return void(0);
    }

    window.pamr.dialog = {
      'widget': widget,
      'body': target,
      'iframe': target.find('iframe'),
      'header': widget.find('.ui-dialog-titlebar')
    };

    //pamrLog();
    
  }

  window.onDialogClose = function(event, ui) {
    //pamrLog();
    if ( !isDialogPluginInstance( event ) ) 
      return void(0);

    delete window.pamr.dialog;
    delete window.pamr.positionAfterDrag;
    delete window.pamr.sizeAfterResize;
    delete window.pamr.sizeAfterAnimation;
    delete window.pamr.sizeOnOpen;
    //pamrLog();
  }

  window.onDialogOpen = function(event, ui) {
    if ( !isDialogPluginInstance( event ) ) 
      return void(0);

    window.pamr.sizeOnOpen = {
      width: $(event.target).dialog('option', 'width'),
      height: $(event.target).dialog('option', 'height')
    }

    //$(window.pamr.dialog.widget).css('opacity', 0.2);
    //pamrLog();
  }

  window.onDialogResizeStart = function(event, ui) {
    if ( !isDialogPluginInstance( event ) ) 
      return void(0);

  }

  window.onDialogResizeStop = function( event, ui ){
    if ( !isDialogPluginInstance( event ) ) 
      return void(0);

    window.pamr.lastInteration = 'resize';
    window.pamr.sizeAfterResize = {
      'width': ui.size.width,
      'height': ui.size.height,
      'top': ui.position.top,
      'left': ui.position.left
    };

    redrawDialog();

    //pamrLog();

  }

  window.onDialogDragStop = function(event, ui) {
    if ( !isDialogPluginInstance( event ) ) 
      return void(0);

    window.pamr.lastInteration = 'drag';
    window.pamr.positionAfterDrag = {
      'left': ui.position.left,
      'top': ui.position.top,
      'width': $(window.pamr.dialog.widget).outerWidth(),
      'height': $(window.pamr.dialog.widget).outerHeight()
    };

    //pamrLog();

  }

  window.listenToWindowResize = function(e){
    if ( e.target == window ) {
      redrawDialog();
    }
  }

  $(document).ready(function(){
    $('body').bind('dialogcreate', window.onDialogCreate);
    $('body').bind('dialogopen', window.onDialogOpen);
    $('body').bind('dialogclose', window.onDialogClose);
    $('body').bind('dialogresizestart', window.onDialogResizeStart);
    $('body').bind('dialogresizestop', window.onDialogResizeStop);

    $('body').bind('dialogdragstop', window.onDialogDragStop);
  })

}