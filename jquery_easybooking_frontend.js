/*
 * This checks for
 *   - existing jQuery (add it if not),
 *   - the use of $ outside of jQuery
 * and registers 'ebFrontEnd' as jQuery plugin for easy implementation of the booking engine.
 *
 * This Version adds the booking engine as section and not as an iFrame (as in prev. versions)!
 *
 * Author: af@easybooking.eu
 */
(function integrateBookingEngine(sign) {
    var dollarSignUsed = (typeof sign == 'undefined') ? false : sign;
  
    if (typeof jQuery != 'undefined') { // jQuery is defined and we are ready to go
  
      // this means some other JS is already using $ as a global, so we have to put jQuery in noConflict mode
      if (dollarSignUsed) $.noConflict();
  
      // Get Booking Engine from server and register it as jQuery function
      (function ($) {
        "use strict";
  
        // var currentStep = -1; // used to implement scrolling to top the top after going to the next step
        function FrontendFrame(el, opts) {
  
          var that,
              randID = "",
              possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
          // Get parent to render the booking-engine into
          this.$el = $(el);
  
          // Set server from where to get the booking-engine
          this.server = '//www.easy-booking.at';
          this.dev = "www.easy-booking.at" !== "www." + "easy-booking" + ".at"; // check if it's the dev environment
  
          // set the defaults and merge with given options
          this.defaults = {
            customerId: 331,
            localeId: 2,
            frameId: "ebFrontEndPlugin",
            frameClass: "ebFrontEndPlugin",
            frameWidth: "auto",
            frameHeight: "auto", // "auto" will cause the plugin to autoresize itself in a given interval, otherwise will use the given plugin height
            serialNo: "2729-3350-3485",
            conversionReservation: "",
            conversionEnquiry: "",
            source: "",
            backgroundColor: "",
            showAvailability: false,
            fontColor: "",
            headingColor: "",
            hideFilters: "off",
            resizeInterval: 500, // resize interval in milliseconds
            disableScroll: false,
            scrollOffset: 0,
            gaAutolinkDomains: "",
            adultOnly: false,
            gtmDL: "dataLayer",
            cppVersion: "V 0.0",
            cppValidityDate: "1900/01/01",
            cppName: "Privacy Policy (Custom)",
            cppUrl: "",
            minimumStay: 3,
          };
  
          this.opts = $.extend(this.defaults, opts);
  
          // Check some of the given parameters and parse them accordingly
          this.opts.customerId = isNaN(this.opts.customerId) ? -1 : parseInt(this.opts.customerId);
          this.opts.localeId = isNaN(this.opts.localeId) ? -1 : parseInt(this.opts.localeId);
          this.opts.resizeInterval = isNaN(this.opts.resizeInterval) ? 500 : parseInt(this.opts.resizeInterval);
          this.opts.scrollOffset = isNaN(this.opts.scrollOffset) ? 0 : parseInt(this.opts.scrollOffset);
  
          // generate random key to identify messages sent from/to booking-engine (mainly used for iFrame integration)
          this.opts.randKey = Math.random().toString(36).substring(7);
  
          // append random string to frameID
          for (var i = 0; i < 5; i++) {
            randID += possible.charAt(Math.floor(Math.random() * possible.length));
          }
          this.opts.frameId += randID;
  
          if (this.dev) {
            this.init();
          } else {
            that = this;
            // Do multidb host check!
            $.ajax({
              url: this.server + '/bookingengine2/mdb.php?c=' + this.opts.customerId + '&l=' + this.opts.localeId,
              dataType: 'json',
              success: function (data) {
                if (!that.dev && data.apiHost && ('//' + data.apiHost !== that.server)) {
                  that.server = '//' + data.apiHost;
                }
                that.init();
                console.debug('XHR --> MDB', '\n\tUrl:', this.url, '\n\tResponse:', data);
              },
              error: function () {
                that.init();
                console.debug('XHR --> MDB Error', '\n\tUrl:', this.url, '\n\tError fetching MDB Host. Using default server (', that.server, ')');
              }
            });
          }
        }
  
        FrontendFrame.prototype.init = function () {
          var that = this;
          // check serial Number
          var apiUrl = this.server + '/easybooking/index.php/apiHotel/';
          var apiCall = "checkSerialNo/";
          var apiParams = this.opts.customerId + "/0/" + this.opts.serialNo;
          $.ajax({
            url: apiUrl + apiCall + apiParams,
            dataType: "json",
            success: function (r) {
              if (r.valid === true) {
                // serial is valid --> continue
                that.initSuccess();
              } else {
                that.serialNoError("invalid");
              }
              console.debug('XHR --> API', '\n\tUrl:', this.url, '\n\tResponse:', r);
            },
            error: function (r) {
              that.serialNoError("server");
              console.debug('XHR --> API Error', '\n\tUrl:', this.url, '\n\tResponse:', r);
            }
          });
        };
        FrontendFrame.prototype.initSuccess = function () {
          // var addedSection = false;
          var that = this;
          var opts = this.opts;
  
          //GV added this
          //If the content is hosted on www.uberclue.com then we know it is content in facebook via HyperTab and FB blocks the command : top.location
          //So no params are possible here..
          var parametersStr = "";
          if (document.domain !== "www.uberclue.com") {
            parametersStr = window.location.search.substr(1);
          }
          var parametersArray = decodeURIComponent(parametersStr).split("&");
          var parameters = {};
  
          // if we have params in the url, parse them into the iframe url
          if (parametersArray.length > 0) {
            this.params = {};
            for (var i = 0; i < parametersArray.length; i++) {
              var parameterParts = parametersArray[i].split("=");
              parameters[parameterParts[0]] = parameterParts[1];
            }
  
            this.fetchUrlParameters(parameters);
          }
  
          var widgetUrl = this.server + '/bookingengine2/';
          if (!this.opts.encapsulated) {
            widgetUrl += '?directIntegration';
          } else {
            var srcParam = [];
            if (opts.source.length > 0) {
              srcParam.push("source=" + opts.source);
            }
            if (opts.backgroundColor.length > 0) {
              srcParam.push("backgroundColor=" + opts.backgroundColor.replace("#", "%23"));
            }
            if (opts.fontColor.length > 0) {
              srcParam.push("fontColor=" + opts.fontColor.replace("#", "%23"));
            }
            if (opts.headingColor.length > 0) {
              srcParam.push("headingColor=" + opts.headingColor.replace("#", "%23"));
            }
            if (opts.hideFilters === "on") {
              srcParam.push("hideFilters=on");
            }
            if (opts.showAvailability === false) {
              srcParam.push("showAvailability=false");
            }
            if (opts.adultOnly) {
              srcParam.push("adultOnly=on");
            }
            if (opts.cppUrl.length > 0) {
              srcParam.push('cppu=' + encodeURI(opts.cppUrl));
              srcParam.push('cppv=' + encodeURI(opts.cppVersion));
              srcParam.push('cppd=' + encodeURI(opts.cppValidityDate));
              srcParam.push('cppn=' + encodeURI(opts.cppName));
            }
            widgetUrl += '?embedded';
            if (srcParam.length > 0) {
              widgetUrl += '&' + srcParam.join('&');
            }
  
            if (this.opts.encapsulated && window.ebbeWidget.params) {
              widgetUrl += '&' + this.getIframeUrlParameters();
            }
  
            widgetUrl += '#/' + opts.customerId + '/' + opts.localeId
          }
  
          that.addSection(widgetUrl);
  
          if (window.addEventListener) {
            window.addEventListener("message", function (e) {
              that.receiveMessage(e);
            }, false);
          } else {
            // some  versions of IE only have attachEvent instead of addEventListener
            window.attachEvent("message", function (e) {
              that.receiveMessage(e);
            });
          }
        };
  
        FrontendFrame.prototype.addSection = function (frameUrl) {
          var encapsulated = !!this.opts.encapsulated;
          var that = this;
          var $frame = $(encapsulated ? '<iframe>' : '<div>');
          $frame.attr('id', that.opts.frameId);
          $frame.attr('class', that.opts.frameClass);
          $frame.css('height', that.opts.frameHeight);
          var width = that.opts.frameWidth;
          if (encapsulated && (width === 'auto' || isNaN(width))) {
            width = '100%';
          }
          $frame.css('width', width);
          that.$el.html($frame);
          if (encapsulated) {
            this.addEncapsulatedSection($frame, frameUrl);
          } else {
            this.addEmbeddedSection($frame, frameUrl);
          }
          that.$frame = $frame;
        };
        FrontendFrame.prototype.addEmbeddedSection = function ($frame, frameUrl) {
          var that = this;
          $.ajax({
            url: frameUrl,
            type: 'GET',
            callback: '?',
            crossDomain: true,
            datatype: 'application/json',
            success: function (htmlContent) {
              $frame.html(htmlContent);
              console.debug('XHR --> FE', '\n\tUrl:', frameUrl, '\n\tResponse:', $(htmlContent));
            },
            error: function (response) {
              console.debug('XHR --> FE Error', '\n\tUrl:', frameUrl, '\n\tResponse:', response);
            }
          });
        };
        FrontendFrame.prototype.addEncapsulatedSection = function ($frame, frameUrl) {
          $frame.attr('src', frameUrl);
          $frame.attr('frameborder', 0);
          $frame.attr('scrolling', 'no');
          $frame.css('overflow-y', 'hidden');
  
          // setup the initial message to the child iframe with basic info
          var msg = {
            sender: "easybooking",
            type: "info",
            first: true,
            randKey: this.opts.randKey,
            autoResize: this.opts.frameHeight === "auto",
            resizeInterval: this.opts.resizeInterval,
            bgColor: this.$el.css("background-color")
          };
          // use an interval to send it, in case the frontend inside the iframe takes longer to load
          // we clear the interval later if it is not necessary anymore (as soon as a response from the child iframe comes back)
          if (msg.resiizeInterval === 500)
            msg.resizeInterval = (navigator.userAgent.indexOf("Trident") > -1 ? 700 : 500);
  
          if (typeof window.frameInterval == "undefined") {
            window.frameInterval = [];
          }
          if (window.frameInterval[this.opts.frameId] === undefined) {
            var that = this;
            window.frameInterval[this.opts.frameId] = setInterval(function () {
              that.sendMessage(JSON.stringify(msg));
            }, 500);
          }
        };
  
        FrontendFrame.prototype.serialNoError = function (errorType) {
          var errorMsg = "A general error occurred.<br/>Please check your configuration and the connection to the Easybooking servers '" + this.server + "'.";
          if (errorType === "invalid") errorMsg = "The provided serial number (" + this.opts.serialNo + ") does not match your customer id (" + this.opts.customerId + ").<br/>Please check your integration code.";
  
          this.$el.html("<div style='color:#B71C1C;font-size:18px;border: 2px solid #B71C1C;border-radius: 0.25rem;display: flex;height: 128px;justify-content: center;align-items: center;'>" +
              "<svg style='width:55px;height:55px' viewBox='0 0 24 24'>" +
              "<path fill='#B71C1C' d='M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16' />" +
              "</svg>" +
              "<div>" + errorMsg + "</div>" +
              "</div>");
          console.error(errorMsg.replace('<br/>', ' '));
        };
  
        FrontendFrame.prototype.sendMessage = function (message) {
          var frame = document.getElementById(this.opts.frameId);
          if (frame === null) {
            clearInterval(window.frameInterval[this.opts.frameId]);
          } else {
            frame.contentWindow.postMessage(message, "*");
          }
        };
        FrontendFrame.prototype.sendNewInfo = function () {
          // send the position of the div that is wrapping the iframe and position of the scroll bar
          // this is needed in the frontend to show the image galleries at the right position
          var msg = {
            sender: "easybooking",
            type: "info",
            first: false,
            offset: this.$frame.offset(),
            scrollTop: $(document).scrollTop()
          };
          this.sendMessage(JSON.stringify(msg));
        };
        FrontendFrame.prototype.receiveMessage = function (e) {
          // we need to check the origin of a message, in case other JS is using the message function too (like Facebook does)
          var messageData = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (messageData.sender === "easybooking") {
            // check if message keys match and only continue if true
            if (messageData.randKey === this.opts.randKey) {
  
              if (messageData.type === "update") {
                // if a message comes back from the Frontend we clear the initial interval
                clearInterval(window.frameInterval[this.opts.frameId]);
                // set the iframe height to it's content's height
                //                    console.log("ADJUSTING",this.opts.frameId,this.$iframe);
                //                    console.log("RECEIVED",messageData.randKey,this.opts.randKey);
  
                if (this.$frame.height() !== messageData.height) {
                  this.$frame.height(messageData.height + "px");
                  if (typeof currentStep !== 'undefined' && currentStep !== messageData.step) {
                    //Save the iframe's offset data
                    var _scrolled = false;
                    var _eb = $('#ebFrontEndFrame');
                    var _ebTop = _eb.offset().top;
                    var _ebWidth = _eb.width();
                    var _ebZ = _eb.css("z-index");
                    if (_ebZ === "auto") _ebZ = 0;
                    _eb.parents().each(function () {
                      if ($(this).css("z-index") !== "auto" && $(this).css("z-index") > _ebZ) _ebZ = $(this).css("z-index");
                    });
                    //Check every element on the page if they could overlap the iframe's top
                    var that = this;
                    $('*').each(function () {
                      //If an element's or it's children's z-index is higher than the iframe's it could overlap it
                      if ($(this).css('position') === "fixed" && $(this).is(":visible") && $(this).width() >= _ebWidth) {
                        var _thisZ = $(this).css("z-index");
                        if (_thisZ === "auto") _thisZ = 0;
  
                        $(this).children().each(function () {
                          if ($(this).css("z-index") !== "auto" && $(this).css("z-index") > _thisZ) {
                            _thisZ = $(this).css("z-index");
                          }
                        });
  
                        if (_ebZ <= _thisZ && !that.opts.disableScroll) {
                          $('html,body').animate({
                            scrollTop: _ebTop - $(this).outerHeight() - that.opts.scrollOffset
                          }, 250);
                        }
                        _scrolled = true;
                        return;
                      }
                    });
                    if (!this.opts.disableScroll && !_scrolled) {
                      //The original scrolling, if there are no overlapping elements
                      $('body, html, document').animate({
                        scrollTop: this.$frame.offset().top
                      }, 250);
                    }
                    currentStep = messageData.step;
                  }
                }
                // send information about the parent window back to frontend
                this.sendNewInfo();
              } // end of update path
  
              if (messageData.type === "conversion") {
                // we have an enquiry or reservation
                if (this.opts.conversionReservation || this.opts.conversionEnquiry) {
                  var goalDiv, goalFrame, iframeSrc;
                  if ($("#eb-conversion-iframe").length && $("#eb-conversion-div").length) {
                    goalDiv = $("#eb-conversion-div");
                    goalFrame = $("#eb-conversion-iframe");
                  } else {
                    goalDiv = $("<div>");
                    $(goalDiv).css("width", 0).css("height", 0).css("display", "none").attr("id", "eb-conversion-div");
                    goalFrame = $("<iframe height='0' width='0'>");
                    $(goalFrame).css("width", 0).css("height", 0).attr("id", "eb-conversion-iframe");
                  }
                  if (this.opts.conversionReservation) {
                    iframeSrc = this.opts.conversionReservation;
                  } else {
                    iframeSrc = this.opts.conversionEnquiry;
                  }
                  if (messageData.conversionType) {
                    if (messageData.conversionType === "enquiry" && this.opts.conversionEnquiry) {
                      iframeSrc = this.opts.conversionEnquiry;
                    }
                  }
                  $(goalFrame).attr("src", iframeSrc);
                  $(goalDiv).html(goalFrame);
                  this.$el.append(goalDiv);
                } else {
                  $.ajax({
                    url: this.server + '/bookingengine2/api/conversionData.php?cid=' + this.opts.customerId + '&type=' + messageData.conversionType + '&amount=' + messageData.amount,
                    dataType: "json",
                    success: function (data) {
                      if (data.src && (!data.checkForEBcommFunction || typeof EBcommFunction === 'undefined')) {
                        var $goalDiv = $('<div>');
                        $goalDiv.css({
                          width: 0,
                          height: 0,
                          display: 'none'
                        });
                        var $goalFrame = $('<iframe height="0" width="0">');
                        $goalFrame.css({
                          width: 0,
                          height: 0
                        });
                        $goalFrame.attr('src', data.src);
                        $goalDiv.html($goalFrame);
                        this.$el.append($goalDiv);
                      }
                    }
                  });
                }
              } // end of conversion path
            }
          }
        };
  
        FrontendFrame.prototype.fetchUrlParameters = function (parameters) {
          if (!parameters.meldewesen && !parameters.selfAdminSession && !parameters.selfAdminSession && !parameters.pmpid) {
            window.ebbeWidget.params.arrivalDate = this.getDateParameter(parameters, true) || undefined;
            window.ebbeWidget.params.departureDate = this.getDateParameter(parameters, false) || undefined;
            window.ebbeWidget.params.adults = this.getStringParameter(parameters, 'numAdults', '2');
            window.ebbeWidget.params.children = this.getStringParameter(parameters, 'numChildren', '0');
            window.ebbeWidget.params.childrenDOBList = this.getStringParameter(parameters, 'childrenDOBs');
          }
          window.ebbeWidget.params.category = this.getStringParameter(parameters, 'category') || undefined;
          window.ebbeWidget.params.selfAdminSession = this.getStringParameter(parameters, 'selfAdminSession') || undefined;
          window.ebbeWidget.params.selfAdminPin = this.getStringParameter(parameters, 'selfAdminPin') || undefined;
          window.ebbeWidget.params.isStepOne = parameters.stepOne === "on";
          window.ebbeWidget.params.isOnlineCheckIn = parameters.meldewesen === "on";
          window.ebbeWidget.params.paymentMethodProviderId = this.getStringParameter(parameters, 'pmpid') || undefined;
  
          console.log('window.ebbeWidget', window.ebbeWidget.params);
          console.log('This is a test!');
        }
        FrontendFrame.prototype.getIframeUrlParameters = function () {
          var queryParams = [];
          var paramKeys = Object.keys(window.ebbeWidget.params);
          for (var i = 0; i < paramKeys.length; i++) {
            var varName = paramKeys[i];
            if (window.ebbeWidget.params.hasOwnProperty(varName)) {
              var value = window.ebbeWidget.params[varName];
              if (value !== undefined && value !== null) {
                if (['arrivalDate', 'departureDate'].indexOf(varName) >= 0) {
                  value = value.getFullYear() + '-' + (value.getMonth() + 1).toString().padStart(2, '0') + '-' + value.getDate().toString().padStart(2, '0');
                }
                queryParams.push(varName + '=' + value);
              }
            }
          }
          return queryParams.join('&');
        }
        FrontendFrame.prototype.getDateParameter = function (parameters, isArrivalDate, opts) {
          var date = null;
          var dateStr = isArrivalDate ? parameters.arrivalDate : parameters.departureDate;
  
          // if arrivalDate is set in the URL we check for the date format and parse it if necessary
          if (dateStr || (isArrivalDate && parameters.yearEB && parameters.monthEB && parameters.dayEB)) {
            var year = isArrivalDate ? parameters.yearEB : null;
            var month = isArrivalDate ? parameters.monthEB : null;
            var day = isArrivalDate ? parameters.dayEB : null;
  
            if (dateStr) {
              dateStr = dateStr.replace(/[-\/]/g, '.');
              var arrSplit = dateStr.split(".");
              if (arrSplit.length === 3) {
                if (arrSplit[2].length === 4) {
                  day = arrSplit[0];
                  month = arrSplit[1];
                  year = arrSplit[2];
                } else {
                  day = arrSplit[2];
                  month = arrSplit[1];
                  year = arrSplit[0];
                }
              }
            }
  
            if (year && month && day) {
              date = new Date(year, parseInt(month) - 1, parseInt(day));
            } else {
              date = new Date(dateStr);
            }
  
          } else if (!isArrivalDate) {
            var nightsStay = this.getNumericParameter(parameters, 'nightsStay', this.opts.minimumStay);
            window.ebbeWidget.params.nightsStay = nightsStay;
            if (window.ebbeWidget.params.arrivalDate) {
              date = new Date(window.ebbeWidget.params.arrivalDate.getTime() + (nightsStay * 86400000));
            }
          }
  
          console.log('getDateParameter', isArrivalDate ? 'arrivalDate' : 'departureDate', date, parameters);
          return date;
        }
        FrontendFrame.prototype.getStringParameter = function (parameters, parameterName, defaultValue) {
          if (!parameters.hasOwnProperty(parameterName)) {
            return defaultValue;
          }
          return parameters[parameterName];
        }
        FrontendFrame.prototype.getNumericParameter = function (parameters, parameterName, defaultValue) {
          if (parameters.hasOwnProperty(parameterName)) {
            var value = parseInt(parameters[parameterName]);
            if (!isNaN(value)) {
              return value;
            }
          }
          return defaultValue;
        }
  
        // add ebFrontEnd to the jQuery functions
        $.fn.ebFrontEnd = function (opts) {
          return this.each(function () {
            // add the new FrontendFrame to the window, to access options directly in the app. (for clientid, localeid, etc...)
            window.ebbeWidget = new FrontendFrame(this, opts);
          });
        };
      })(jQuery, document, window);
  
    } else { // jQuery is undefined so we add it to the WS
      // check if some JS is already using the $ sign and if jQuery is loaded (loads it otherwise!)
      if (typeof $ != "undefined") dollarSignUsed = true;
  
      // generate script tag and append it to the body
      var s = document.createElement("script");
      // s.type = "text/javascript";
      s.src = "https://cdn.jsdelivr.net/npm/jquery@3.1.0/dist/jquery.min.js";
      document.body.appendChild(s);
  
      // if jQuery does not exist yet (meaning the script has not loaded yet), we check again after 300ms
      setTimeout(integrateBookingEngine, 500, dollarSignUsed);
    }
  })();