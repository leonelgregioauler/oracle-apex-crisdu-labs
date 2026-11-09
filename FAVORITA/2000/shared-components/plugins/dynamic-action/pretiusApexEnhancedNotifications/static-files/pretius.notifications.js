$.widget('pretius.notifications', {
  stackNotifications: [],
  stackEmbeded: [],
  options: {
    successMessageTemplate: null,
    notificationMessageTemplate: null
  },
  _create: function (  ) {
    this._super( this.options );
  },
  _getTrimedSuccessTemplate: function(  ){
    var 
      returnValue = $(this.options.successMessageTemplate).clone().children().first(),
      returnValueHtml = returnValue.parent().html();

    returnValueHtml = returnValueHtml.replace('#SUCCESS_MESSAGE#', '<div class="pretius--htmlMessage">#SUCCESS_MESSAGE#</div>');
    returnValueHtml = returnValueHtml.replace('#MESSAGE#'        , '<div class="pretius--htmlMessage">#MESSAGE#</div>');
    
    returnValue = $(returnValueHtml).removeAttr('id').uniqueId().addClass('pretius--notification');;

    return returnValue;
  },
  _getTrimedMessageTemplate: function(  ){

    var 
      returnValue = returnValue = $(this.options.notificationMessageTemplate).clone().children().first();
      returnValueHtml = returnValue.parent().html();

    returnValueHtml = returnValueHtml.replace('#SUCCESS_MESSAGE#', '<div class="pretius--htmlMessage">#SUCCESS_MESSAGE#</div>');
    returnValueHtml = returnValueHtml.replace('#MESSAGE#'        , '<div class="pretius--htmlMessage">#MESSAGE#</div>');
    
    returnValue = $(returnValueHtml).removeAttr('id').uniqueId().addClass('pretius--embeded');

    return returnValue;
  },

  destroy: function() {
    $.Widget.prototype.destroy.call(this);
  },
  
  pushNotification: function( pNotificationObject, daObject ){
    var pushedNotification = null;

    var notification = $('<div></div>').notification( pNotificationObject, {manager: this, dynamicAction: daObject} );
  
    notification.notification('draw');
   

  },  
  getTemplate: function( what ){
    if ( what == 'NOTIFICATION' ) {
      return this._getTrimedSuccessTemplate();
    }
    else if ( what == 'EMBEDED' ) {
      return this._getTrimedMessageTemplate();
    }
    else {
      return null;
    }
      
    
  },
  throwError: function( errorTitle, errorMsg ){
    var notification = $('<div></div>').notification( {
      manager: this,
      dynamicAction: null,
      closeAnimation: "REMOVE",
      displayAs: "NOTIFICATION",
      duration: "0",
      insertInto: "body",
      type: "DANGER",
      where: "TOP",
      msgType : 'JSJSON',
      msgStaticText : null,
      msgJsReturn  : 'return data;',
      position: 'TOPRIGHT',
      merge: false,
      scrollTo: false,
      dynamicAction: {data: {
        msg: errorTitle,
        lines: [ errorMsg ]
      }}
    });
  
    notification.notification('draw');
    throw( errorMsg );
  }  
});