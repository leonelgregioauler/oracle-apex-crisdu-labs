$.widget('pretius.notification', {
  insertIntoElem: null,
  notificationContainer: null,
  template: null,
  embededContainer: null,
  errorHandling: {

    title: {
      conf: "Plugin configuration error",
      internal: "Internal plugin error"
    },
    confError: {
      insertIntoNotFound: 'jQuery selector provided in "Insert into" attribute does not exists.',
      fixedAffectedNotFound: 'jQuery selector provided in "Affected by fixed position" attribute does not exists.',
      templateSubStringToMany: 'To many substitution strings in notification template (#MESSAGE# or #SUCCESS_MESSAGE#).',
      templateSubStringNotFound: '#MESSAGE# or #SUCCESS_MESSAGE# not found within the template.',
      messageJsReturn: 'Function returning message contains JavaScript errors: ',
      messageJsReturnNotValidJSON: 'Function returning message returned invalid JSON object.',
      messageJsReturnNotSupportedObj: 'Function returning message returned not supported JS object.',
      messageJsReturnJsonWrongObject: 'Function returning message error: expected JSON object got ',
      messageJsReturnStringWrongObject: 'Function returning message error: expected String got ',
      messageJsReturnMixedWrongObject: 'Function returning message error: expected String got '
    },
    internalError: {
      unknownOptionType: 'Unknown value of "Type" attribute  attribute:',
      unknownOptionWhere: 'Unkown value of "Where" attribute  attribute:',
      unknownOptionPosition: 'Unknown value of "Position" attribute attribute:',
      unknownOptionMsgType: 'Unknown value of "Notification type" attribute:',
      unknownDisplayAs: 'Unknown value of "Display as" attribute:'
    }
  },

  options: {
    closeAnimation: "REMOVE",
    displayAs: "EMBEDED",
    duration: "1000",
    insertInto: ".t-Body-main",
    type: "WARNING",
    where: "TOP",
    manager: null,
    msgType : null,
    msgStaticText : null,
    msgJsReturn  : null,
    position: 'TOPRIGHT',
    merge: false,
    scrollTo: false,
    fixed: false,
    fixedAffected: null,
    removeOther: false,
    dynamicAction: null
  },
  //--------------------
  _create: function () {
    var 
      insertInto, bodyContent, errorMsg;

    //przeciąż this.options
    this._super( this.options );
    this.options.duration = parseInt( this.options.duration );

    this.template = this.options.manager.getTemplate( this.options.displayAs );

    //pomocnicze przy rysowaniu notyfikacji
    insertInto = $(this.options.insertInto).first();
    //jesli insertInto zawiera .t-Body-content to bedzie wstawial notyfikacje do tego elementu
    bodyContent = insertInto.find('.t-Body-content');

    if ( insertInto.size() == 0 ) {
      errorMsg = this.errorHandling.confError.insertIntoNotFound;
      this.options.manager.throwError( this.errorHandling.title.conf, errorMsg );
      throw errorMsg;
    }

    this.insertIntoElem        = bodyContent.size() > 0 ? bodyContent : insertInto;

    this.embededContainer      = this.insertIntoElem.find('> .t-Body-alert');
    this.notificationContainer = this.insertIntoElem.find('> .p-Alert.'+this.options.position);

    //dodaj kontener dla embeded
    if ( this.embededContainer.size() == 0 ) {
      this.embededContainer = $('<div class="t-Body-alert"></div>').prependTo( this.insertIntoElem );
    }

    //dodaj kontener dla notification
    if ( this.notificationContainer.size() == 0 ) {
      this.notificationContainer = $('<div class="p-Alert '+this.options.position+'"></div>').prependTo( this.insertIntoElem );
    }

  },
  //---------------------
  _destroy: function () {

  },
  //--------------------------------------
  _getElemContaining: function( string ) {
    var domElement, errorMsg;

    domElement = this.template.find(':contains('+string+')').filter(function(index, elem){
      return $(elem).children().size() == 0;
    });

    if ( domElement.size() > 1 ) {
      errorMsg = this.errorHandling.confError.templateSubStringToMany;
      this.options.manager.throwError( this.errorHandling.title.conf, errorMsg );
      throw errorMsg;
    }
    else if ( domElement.size() == 0 ) {
      errorMsg = this.errorHandling.confError.templateSubStringNotFound;
      this.options.manager.throwError( this.errorHandling.title.conf, errorMsg );
      throw errorMsg;
    }
    else {
      return domElement;
    }
  },
  //-------------------------------
  _insertNotification: function() {
    if ( this.options.type == 'SUCCESS' ) {
      this.template.removeClass('t-Alert--success').addClass('t-Alert--success')
    }
    else if ( this.options.type == 'WARNING' ) {
      this.template.removeClass('t-Alert--success').addClass('t-Alert--warning') 
    }
    else if ( this.options.type == 'DANGER' ) {
      this.template.removeClass('t-Alert--success').addClass('t-Alert--danger')  
    }
    else {
      errorMsg = this.errorHandling.internalError.unknownOptionType+this.options.type;
      this.options.manager.throwError( this.errorHandling.title.conf, errorMsg );
      throw errorMsg;
    }

    //wstawienie
    if ( this.options.where == 'TOP' ) {
      this.notificationContainer.prepend( this.template );
    }
    else if ( this.options.where == 'BOTTOM' ) {
      this.notificationContainer.append( this.template );
    }
    else {
      errorMsg = this.errorHandling.internalError.unknownOptionWhere+this.options.where;
      this.options.manager.throwError( this.errorHandling.title.internal, errorMsg );
      throw errorMsg;
    }

    if ( $.inArray(this.options.position, ['BOTTOMRIGHT', 'TOPRIGHT']) > -1 ) {
      this.template.css('right', '-120%').slideUp(0).fadeOut(0).animate({height: 'toggle', opacity: 'toggle', right: 12});
    }
    else if ( $.inArray(this.options.position, ['TOPLEFT', 'BOTTOMLEFT']) > -1 ) {
      this.template.css('left', '-120%').slideUp(0).fadeOut(0).animate({height: 'toggle', opacity: 'toggle', left: 12});
    }
    else {
      errorMsg = this.errorHandling.internalError.unknownOptionPosition+this.options.position;
      this.options.manager.throwError( this.errorHandling.title.internal, errorMsg );
      throw errorMsg;
    }

  },
  //--------------------------
  _insertEmbeded: function() {
    var 
      parent = this.embededContainer.parent(),
      parentPadding = parseInt( parent.css('padding') ),
      pluginClass = 'pretius--'+this.options.type,
      merge = this.options.merge ? 'merge' : '',
      showBullets = this.options.showBullets ? 'showBullets' : '',
      mergeWith = undefined,
      elemToMerge;

    if ( parentPadding > 0 ) {
      this.template.css({
        'margin': -parentPadding,
        'margin-bottom': parentPadding
      });
    }
    else {
      null;
    }

    this.template.css('display', 'block')

    if ( this.options.type == 'SUCCESS' ) {
      this.template.removeClass('t-Alert--warning t-Alert--page')
        .addClass('t-Alert--success');

    }
    else if ( this.options.type == 'WARNING' ) {
      this.template.removeClass('t-Alert--warning')
        .addClass('t-Alert--warning');
    }
    else if ( this.options.type == 'DANGER' ) {
      this.template.removeClass('t-Alert--warning')
        .addClass('t-Alert--danger');
    }
    else {
      errorMsg = this.errorHandling.internalError.unknownOptionType+this.options.type;
      this.options.manager.throwError( this.errorHandling.title.internal, errorMsg );
      throw errorMsg;
    }

    if ( this.options.merge ) {
      elemToMerge = this.embededContainer.find('> .'+pluginClass+'.merge');
      mergeWith = elemToMerge.find('.pretius--htmlMessage').clone().html();
      elemToMerge.remove();
      //jesli zmergowal to oblicz margin-top dla nastepnego elementu
    }



    //wpisz wiadomość do template
    this._insertMsgIntoTemplate( '#MESSAGE#', mergeWith);
    
    this.template
      .addClass( pluginClass )  //add type as class
      .addClass( merge )        //add indicator if the message is mergable
      .addClass( showBullets ); //

    if ( this.options.removeOther ) {
      //this.embededContainer.empty();
      this.embededContainer.find('.pretius--embeded button').trigger('removeOnDemand');
      this.embededContainer.find(':not(.pretius--embeded) button').trigger('click');      
    }



    //wstawienie
    if ( this.options.where == 'TOP' ) {
      this.template = this.template.prependTo( this.embededContainer );
    }
    else if ( this.options.where == 'BOTTOM' ) {
      this.template = this.template.appendTo( this.embededContainer );
    }
    else {
      errorMsg = this.errorHandling.internalError.unknownOptionWhere;
      this.options.manager.throwError( this.errorHandling.title.internal, errorMsg );
      throw errorMsg;      
    }

    //fixed    
    if ( this.options.fixed ) {
      this.embededContainer.addClass('fixed');
      this._fixedAffectedAddMargin();
    }

  },  
  //------------------------------------
  _parseJavaScriptFunction: function() {
    var tempFunc, errorMsg;

    try{
      tempFunc = new Function ( "data", this.options.msgJsReturn );
      return tempFunc( this.options.dynamicAction.data );
      
    } catch(error) {
      errorMsg = this.errorHandling.confError.messageJsReturn+error;
      this.options.manager.throwError( this.errorHandling.title.conf, errorMsg );
      throw errorMsg;      
    }

  },
  //-----------------------------------
  _getMsgJavaScriptString: function() {
    var 
      tempFuncResult = this._parseJavaScriptFunction(),
      tempFuncResultType = Object.prototype.toString.call( tempFuncResult ),
      errorMsg;

    if ( 
      tempFuncResultType === "[object String]" 
      || tempFuncResultType === "[object Number]" 
    ) {
      //ok
      return '<div class="string--js">'+tempFuncResult+'</div>';
    }
    else {
      errorMsg = this.errorHandling.confError.messageJsReturnStringWrongObject + ' '+tempFuncResultType;
      this.options.manager.throwError( this.errorHandling.title.conf, errorMsg );
      throw errorMsg;
    }


  },
  //----------------------------------
  _getMsgJavaScriptMixed: function() {
    var 
      //javascriptFunctionBody = this.options.msgJsReturn,
      tempFuncResult = this._parseJavaScriptFunction(),
      tempFuncResultType = Object.prototype.toString.call( tempFuncResult ),
      errorMsg;

    //sprwadz poprawnosc obiektu wejsciowego
    if ( 
      tempFuncResultType === "[object String]" ||
      tempFuncResultType === "[object Number]"
    ) {
      //obiekt wejsciowy jest stringiem lub liczba, wyswietlamy od razu
      return '<div class="string--js">'+tempFuncResult+'</div>';
    } else if ( tempFuncResultType === "[object Object]" ) {
      //jest obiektem
      return this._getMsgJavaScriptJSON();

    } else {
      errorMsg = this.errorHandling.confError.messageJsReturnNotSupportedObj;
      this.options.manager.throwError( this.errorHandling.title.conf, errorMsg );
      throw errorMsg;
    }

  },
  //----------------------------
  _getMsgModalPage: function() {
    try {
      return this.options.dynamicAction.data.successMessage.text;  
    }    
    catch (error){
      throw error;
    }
    
  },
  //---------------------------------
  _getMsgJavaScriptJSON: function() {
    var 
      tempFuncResult = this._parseJavaScriptFunction(),
      tempFuncResultType = Object.prototype.toString.call( tempFuncResult ),
      liClass = this.options.showBullets ? 'htmldbStdErr' : 'htmldbOraErr',

      msgContainer,
      msgUl,
      errorMsg;


    if ( tempFuncResultType === "[object Object]" ) {
      
      if ( 
        tempFuncResult.msg != undefined && (
          Object.prototype.toString.call( tempFuncResult.msg ) === "[object String]" ||
          Object.prototype.toString.call( tempFuncResult.msg ) === "[object Number]"
        ) &&
        tempFuncResult.lines != undefined &&
        Object.prototype.toString.call( tempFuncResult.lines ) === "[object Array]"
      ) {
        //ma odpowiednie atrybuty
        //do przerobienia na mustache jesli uznam za stosowne
        msgContainer = $('<div></div>');

        $('<span class="aErrMsgTitle">'+tempFuncResult.msg+'</span>').appendTo( msgContainer );
        msgUl = $('<ul class="htmldbUlErr"></ul>').appendTo( msgContainer );

        for ( var i=0, length = tempFuncResult.lines.length; i < length; i++) {
          msgUl.append( $('<li class="'+liClass+'">'+tempFuncResult.lines[i]+'</li>') );
        }

        return msgContainer;

      } 
      else if ( 
        tempFuncResult.msg != undefined && (
          Object.prototype.toString.call( tempFuncResult.msg ) === "[object String]" ||
          Object.prototype.toString.call( tempFuncResult.msg ) === "[object Number]"
        ) &&
        tempFuncResult.list != undefined &&
        Object.prototype.toString.call( tempFuncResult.list ) === "[object Array]"
      ) {
        //ma odpowiednie atrybuty
        //do przerobienia na mustache jesli uznam za stosowne
        msgContainer = $('<div></div>');

        $('<span class="aErrMsgTitle">'+tempFuncResult.msg+'</span>').appendTo( msgContainer );
        msgUl = $('<ul class="htmldbUlErr"></ul>').appendTo( msgContainer );

        for ( var i=0, length = tempFuncResult.list.length; i < length; i++) {
          msgUl.append( $('<li class="'+liClass+'">'+tempFuncResult.list[i]+'</li>') );
        }

        return msgContainer;

      }       
      else {
        errorMsg = this.errorHandling.confError.messageJsReturnNotValidJSON;
        this.options.manager.throwError( this.errorHandling.title.conf, errorMsg );
        throw errorMsg;

      }

    } 
    else {
      errorMsg = this.errorHandling.confError.messageJsReturnJsonWrongObject + ' '+tempFuncResultType;
      this.options.manager.throwError( this.errorHandling.title.conf, errorMsg );
      throw errorMsg;
    }


    return 'todo';
  },
  //--------------------------------------------------------------
  _insertMsgIntoTemplate: function( pMsgPlaceHolder, pMergeWith ){
    var 
      msgHtml,
      elementContaining,
      errorMsg;

    if ( this.options.msgType == 'STATIC' ) {
      msgHtml = $('<div class="string--static">'+this.options.msgStaticText+'</div>');
    }
    else if ( this.options.msgType == 'JSJSON' ) {
      msgHtml = this._getMsgJavaScriptJSON();
    }
    else if ( this.options.msgType == 'JSSTRING' ) {      
      msgHtml = this._getMsgJavaScriptString();
    }
    else if ( this.options.msgType == 'JSMIXED' ) {
      msgHtml = this._getMsgJavaScriptMixed();
    }
    else if ( this.options.msgType == 'DIALOG' ) {
      msgHtml = this._getMsgModalPage();
    }
    else {
      errorMsg = this.errorHandling.internalError.unknownOptionMsgType+this.options.msgType;
      this.options.manager.throwError( this.errorHandling.title.internal, errorMsg );
      throw errorMsg;      
    }

    //musi byc zadeklarowana zmienna
    elementContaining = this._getElemContaining( pMsgPlaceHolder );
    elementContaining.empty()

    if ( pMergeWith != undefined && this.options.where == 'TOP' ) {
      elementContaining.append( msgHtml ).append( pMergeWith );
    }
    else if ( pMergeWith != undefined && this.options.where == 'BOTTOM' ) {
      elementContaining.append( pMergeWith ).append( msgHtml );
    }
    else {
      elementContaining.append( msgHtml );
    }
    

  },
  //---------------
  draw: function(){
    var 
      msgPlaceHolder = null,
      loader,
      eventObject = {
        //closeAnimation: "REMOVE",
        //manager: null,
        //msgType : null,
        //msgStaticText : null,
        //msgJsReturn  : null,
        //dynamicAction: null
        "displayAs": this.options.displayAs,
        "duration": this.options.duration,
        "insertInto": this.options.insertInto,
        "type": this.options.type,
        "where": this.options.where,
        "position": this.options.position,
        "merge": this.options.merge,
        "scrollTo": this.options.scrollTo,
        "fixed": this.options.fixed,
        "fixedAffected": this.options.fixedAffected,
        "removeOther": this.options.removeOther
      };

    //wstaw template do aplikacji
    if ( this.options.displayAs == 'NOTIFICATION' ) {
      msgPlaceHolder = '#SUCCESS_MESSAGE#';
      this._insertMsgIntoTemplate( msgPlaceHolder );
      this._insertNotification();
    }
    else if ( this.options.displayAs == 'EMBEDED' ) {
      this._insertEmbeded();
    }
    else {
      errorMsg = this.errorHandling.internalError.unknownDisplayAs+this.options.displayAs;
      this.options.manager.throwError( this.errorHandling.title.internal, errorMsg );
      throw errorMsg;      
    }

    //podepnij guzik do zamukania
    //this.template.find('button').click( $.proxy(this.close, this) );
    this.template.find('button').bind('click', $.proxy(this.close, this));
    this.template.find('button').bind('removeOnDemand', $.proxy(this.closeOnDemand, this));

    
    //how long notification / embeded should last?
    if ( this.options.duration > 0 ) {
      loader = $('<div class="durationIndicator"></div>');

      loader.appendTo( this.template ).animate( {width: 'toggle'}, {
        duration: this.options.duration,
        complete: $.proxy(function(){ this.close() }, this)
      });
    }

    if ( this.options.scrollTo ) {
      $('html, body').animate( { scrollTop: (this.template.offset().top - this.embededContainer.offset().top) }, 100);
    }

    eventObject.notification = this.template;
    apex.event.trigger(document, 'pretiusnotificationdraw', eventObject);

  },
  //---------------------------
  _removeTemplate: function() {
    this.template.remove();

    if ( this.options.fixed ) {
      this._fixedRemove();
    }

  },
  //-----------------------------------
  _fixedAffectedAddMargin: function() {

    var 
      elem = $(this.options.fixedAffected),
      errorMsg;

    if ( elem.size() == 0 ) {
      errorMsg = this.errorHandling.confError.fixedAffectedNotFound;
      this.options.manager.throwError( this.errorHandling.title.conf, errorMsg );
      throw errorMsg;      

    }
    else {
      elem.data('oldMarginTop', elem.css('marginTop'));
      elem.css('marginTop', this.embededContainer.outerHeight());  
    }
    
  },
  _fixedRemove: function(){
    var 
      elem = $(this.options.fixedAffected),
      oldMarginTop = elem.data('oldMarginTop');

    if ( oldMarginTop == '0px' || oldMarginTop == null || oldMarginTop == 'undefined' ) {
      elem.css('marginTop', '');
    }
    else {
      elem.css('marginTop', oldMarginTop); 
    }

    this.embededContainer.removeClass('fixed');

  },
  closeOnDemand: function(){
    this._removeTemplate();
  },
  //-----------------
  close: function() {
    var 
      obj = this,
      elem = $(this.options.fixedAffected);

    if ( this.options.closeAnimation == 'REMOVE' ) {

      this._removeTemplate();

    }
    //do dorobienia slide, czyli ucieczka w lewo badz prawo
    else {
      this.template[this.options.closeAnimation]( 400, $.proxy(function(){ 

        this._removeTemplate();
      }, this) );
    }

  }
});