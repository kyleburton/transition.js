/*jslint browser: true, maxerr: 50, indent: 2, nomen: false, regexp: false */
/*global window, console, $, ActiveXObject, tmpl, alert */
"use strict";
if (!window.console) {
  window.console = {
    log: function () {
    },
    dir: function () {
    }
  };
}

var EasyApi = EasyApi || (function () {
 "use strict";
  var self = {}, onReadyCallbacks;

  self.isArray = function (thing) {
    return Object.prototype.toString.call(thing) === '[object Array]';
  };

  self.timeouts = {};
  self.defer = function (fn, delay) {
    delay = delay || 100;
    var id = setTimeout(fn, delay);
    self.timeouts[id] = {fn: fn, delay: delay};
    return id;
  };

  onReadyCallbacks = [];
  self.initialize = function () {
    var idx;
    self.compileTemplates();
    for (idx = 0; idx < onReadyCallbacks.length; idx += 1) {
      try {
        onReadyCallbacks[idx]();
      }
      catch (e) {
        self.lastError = e;
        console.error('Callback Failed: ' + onReadyCallbacks[idx]);
        console.error(e);
        console.error(e.stack);
      }
    }
  };

  self.forEach = function (seq, fn) {
    var ii;
    if (undefined === seq  || seq === null) {
      // console.log('Warning: sequence not defined (undefined or null) for fn: ' + fn);
      return;
    }
    for (ii = 0; ii < seq.length; ii += 1) {
      fn(seq[ii]);
    }
  };

  self.map = function (seq, fn) {
    var result = [], ii;
    if (!self.isDefined(seq)) {
      console.log('Warning: sequence is undefined or nil in map function');
      return result;
    }
    for (ii = 0; ii < seq.length; ii += 1) {
      result[ii] = fn(seq[ii]);
    }
    return result;
  };

  self.filter = function (seq, fn) {
    var result = [], ii;
    if (!self.isDefined(seq)) {
      console.log('Warning: sequence is undefined or nil in map function');
      return result;
    }

    for (ii = 0; ii < seq.length; ii += 1) {
      if (fn(seq[ii])) {
        result.push(seq[ii]);
      }
    }

    return result;
  };

  self.isDefined = function (val) {
    return val !== undefined && val !== null;
  };

  self.each = function (seq, fn) {
    var ii;
    for (ii = 0; ii < seq.length; ii += 1) {
      fn(ii, seq[ii]);
    }
  };

  self.initializers = {};
  self.initializer = function (id, cb) {
    id = self.makeTemplateName(id);
    if (!id.match(/Template$/)) {
      id = id + "Template";
    }
    self.initializers[id] = self.initializers[id] || [];
    self.initializers[id].push(cb);
  };

  self.fireTemplateInitializers = function (id, result, data) {
    var fns = self.initializers[id] || [];
    console.log('calling init for %s', id);
    self.forEach(fns, function (fn) {
      fn(result, data);
    });
  };

  self.makeTemplateName = function (n) {
    var parts = n.split(/[\-\/]/),
        res = parts.shift();
    self.forEach(parts, function (part) {
      res += part.charAt(0).toUpperCase() + part.slice(1);
    });
    return res;
  };

  self.scriptLoadErrorHandler = function (jsUrl) {
    return function (jqxhr, settings, exception) {
      EasyApi.lastError = exception;
      console.error('ERROR: failed to load js [' + jsUrl + '] exception was: ' + exception);
      console.error(exception);
      console.error(exception.stack);
    };
  };

  self.viewsFetched = {};

  self.fetchView = function (view) {
    console.log('fetching view');

    var viewHtmlUrl = "views/" + view + ".html" + "?" + (new Date()).getTime(),
        viewJsUrl   = "views/" + view + ".js" + "?" + (new Date()).getTime(),
        viewTemplateName = self.makeTemplateName(view + "Template");

    if (view.indexOf('/') === 0) {
      viewHtmlUrl = view + ".html" + "?" + (new Date()).getTime();
      viewJsUrl = view + ".js" + "?" + (new Date()).getTime();
    }
    console.log('fetching viewUrl: ' + viewHtmlUrl);
    if (! self.viewsFetched[viewTemplateName]) {
      self.viewsFetched[viewTemplateName] = true;
      $.ajax({
        type:  'GET',
        url:   viewHtmlUrl,
        contentType: "text/plain",
        dataType: "text",
        processData: false,
        async: false,
        error: function (a, b, ex) {
          console.error('Got error: ' + ex);
          console.error(ex);
        },
        success: function (html) {
          var script = $('<script>');
          console.log('in success fn, view templ name is ' + viewTemplateName);
          script.attr('type', 'text/html');
          script.attr('id', viewTemplateName);
          script.text(html);
          self.compileTemplate(script[0]);
          $('body').append(script);
        }
      });
      $.ajax({
        type:     "GET",
        url:      viewJsUrl,
        dataType: "script",
        error:    EasyApi.scriptLoadErrorHandler(viewJsUrl),
        async:    false
      });
    }
  };

  self.renderPartialInto = function (view, selector, data) {
    var viewTemplateName = self.makeTemplateName(view + "Template");
    self.fetchView(view);
    self.render[viewTemplateName](data).into(selector);
  };

  self.renderPartialAppendTo = function (view, selector, data) {
    try {
      var viewTemplateName = self.makeTemplateName(view + "Template"), res;
      self.fetchView(view);
      res = self.render[viewTemplateName](data).html();
      $(selector).append(res);
      self.fireTemplateInitializers(viewTemplateName, res, data);
    }
    catch (e) {
      console.error("Error rendering partial: view=%s selector=%s data=%s", view, selector, data);
      console.error(e.toString());
      console.error(e.stack);
      console.dir(data);
    }
  };

  self.render = {};

  self.compileTemplate = function (templateNode) {
    var tfn = tmpl(templateNode.innerHTML);
    self.render[templateNode.id] = function (data) {
      var obj = {};
      data = data || {};
      obj.into = function (id) {
        console.log('id:%s data:%s', id, data);
        var result = tfn(data),
            domNode = $('#' + id);
        console.log('result: %s', domNode);
        self.n = domNode;
        domNode.html(result);
        self.fireTemplateInitializers(templateNode.id, domNode, data);
      };
      obj.html = function () {
        return tfn(data);
      };
      obj.target = function (selector) {
        console.log('rendering into: %s', selector);
        obj.into(selector);
      };
      // NB: appendTo
      return obj;
    };
  };

  self.compileTemplates = function () {
    self.forEach($("script[type='text/html']"), self.compileTemplate);
  };

  self.onReady = function (cb) {
    if ("function" !== typeof cb) {
      throw ("Error: onReady takes a function, was passed: " + (typeof cb) + " / " + cb);
    }
    onReadyCallbacks.push(cb);
  };

  self.getTemplate = function (tmplName) {
    return document.getElementById(tmplName).innerHTML;
  };

  self.renderTemplate = function (tmplName, data) {
    return tmpl(self.getTemplate(tmplName), data);
  };

  self.redirectTo = function (location) {
    document.location = location;
  };

  self.redirectTo_ = function (location) {
    return function () {
      document.location = location;
    };
  };

  self.refreshPage = function () {
    document.location = window.location;
  };

  self.documentUri = function () {
    self._documentUri = self._documentUri || window.location.toString();
    return self._documentUri;
  }; 

  self.queryParam = function (k) {
    return $.deparam.querystring(self.documentUri())[k];
  };

  self.deleteButton = function (buttonId, text) {
    var button;
    text = text || 'Delete';
    button = $('<button class="delete-button" id="' + buttonId + '">' + text + '</button>');
    return button;
  };

  self.linkTo = function (text, href) {
    return '<a href="' + href + '">' + text + '</a>';
  };

  self.makeCounter = function (start) {
    if (typeof start === 'undefined') {
      start = 0;
    }
    return function () {
      start += 1;
      return start;
    };
  };

  self.canonicalizeNumber = function (num) {
    num = num.replace(/\D+/g, '');
    if (num.length === 10) {
      num = "1" + num;
    }
    return num;
  };

  self.makeApi = function (target, name, method, url, attrs) {
    var origName = name, targetObj, parts, ii, path;
    target._reqs = target._reqs || {};

    target._reqs[origName] = function () { return EasyApi.ApiRequest(method, url, attrs).doJson(); };

    targetObj = target;
    parts = name.split('.');
    for (ii = 0; ii < parts.length - 1; ii += 1) { 
      path = parts[ii];
      targetObj[path] = targetObj[path] || {};
      targetObj = targetObj[path];
      name = parts[ii + 1];
    }    

    targetObj[name] = function () { 
      return target._reqs[origName]();
    };   
  };

  self.flashError = function (msg) {
    var ediv = $('div#error');
    ediv.html(msg);
    ediv.show(msg,'fast');

    setTimeout(function () {
      console.log('hiding error div...');
      $('div#error').hide('slow');
    }, 2000);
  };

  self.flashError_ = function (msg) {
    return function () {
      self.flashError(msg);
    };
  };

  return self;
}());

EasyApi.Dom = EasyApi.Dom || {};
EasyApi.Dom.serializeForm = function (selector) {
  var res = {};
  EasyApi.forEach($(selector).serializeArray(), function (dat) {
    res[dat.name] = dat.value;
  });
  return res;
};

EasyApi.Dom.tr = EasyApi.Dom.tr || function() {
  var self = {node: $('<tr>')};

  self.id = function (id) {
    self.node.attr('id', id);
    return self;
  };

  self.appendTdObjects = function () {
    EasyApi.forEach(arguments, function (content) {
      if (typeof content === 'string') {
        self.node.append($('<td>').html(content));
      } else {
        self.node.append($('<td>').append(content));
      }
    });
    return self;
  };

  return self;
};

EasyApi.Dom.table = EasyApi.Dom.table || function (id) {
  var self = {}, tableNode, thead, tbody;
  if (0 === id.indexOf('#')) {
    id = id.substring(1);
  }
  tableNode = $('table#' + id);
  thead     = $('table#' + id + ' thead');
  tbody     = $('table#' + id + ' tbody');

  if (0 === tableNode.length) {
    throw ('No table exists with the given ID: ' + id);
  }

  if (0 === thead.length) {
    tableNode.append($('<thead>'));
    thead = $('table#' + id + ' thead');
  }

  if (0 === tbody.length) {
    tableNode.append($('<tbody>'));
    tbody = $('table#' + id + ' tbody');
  }

  self.setHeader = function (seq) {
    if (seq.constructor.name === "String") {
      seq = seq.split(/\s*,\s*/);
    }

    var row = '<tr>';
    EasyApi.forEach(seq, function (elt) {
      row += '<th>' + elt + '</th>';
    });
    row += '</tr>';
    thead.html(row);
    return self;
  };

  self.setRows = function (seq, rowFn) {
    tbody.html('');
    self.appendRows(seq, rowFn);
    return self;
  };

  self.appendRows = function (seq, rowFn) {
    EasyApi.forEach(seq, function (elt) {
      tbody.append(rowFn(elt));
    });
    return self;
  };

  self.appendRow = function () {
    var newRow = $('<tr>');
    EasyApi.forEach(arguments, function (tdVal) {
      var newTd = $('<td>');
      if (tdVal === undefined || tdVal === null) {
        newRow.append(newTd.html('&nbsp;'));
      }
      else if (typeof(tdVal) === 'string') {
        newRow.append(newTd.html(tdVal));
      } 
      else {
        newRow.append(newTd.append(tdVal));
      }
    });
    tbody.append(newRow);
    return self;
  };

  self.appendRenderedRow = function (elt) {
    tbody.append(elt);
    return self;
  };

  self.appendRowObjects = function () {
    var newRow = $('<tr>');
    EasyApi.forEach(arguments, function (tdVal) {
      var newTd = $('<td>').append(tdVal);
      newRow.append(newTd);
    });
    console.log('appending row');
    console.dir(newRow);
    tbody.append(newRow);
    console.log('returning');
    return self;
  };

  self.renderResultSet = function (resultSet, mappings) {
    var header, records, prop;

    if (resultSet.resultSet) { 
      resultSet = resultSet.resultSet;
    }

    if (resultSet.records) {
      records = resultSet.records;
    }
    else if (EasyApi.isArray(resultSet)) {
      records = resultSet;
    }

    if (!records) {
      throw ("Error: resultSet doesn't look like a resultSet, can't find records within it: " + JSON.stringify(resultSet));
    }

    if (!mappings) {
      mappings = [];
      for ( prop in records[0] ) {
        mappings.push({label: prop, field: prop});
      }
      console.log('no mappings provided, defaulting to');
      console.log(JSON.stringify(mappings));
    }

    header = EasyApi.map(mappings, function (m) {
      return m.label;
    });

    console.log('setting header to: ' + header.join(", "));
    self.setHeader(header.join(", "));
    self.setRows(records, function (rec) {
      var row = $('<tr>');
      EasyApi.forEach(mappings, function (mapping) {
        var value, td = $('<td>');
        if (mapping.field) {
          value = rec[mapping.field];
        }

        if (mapping['class'])  {
          td.addClass(mapping['class']);
        }

        if (mapping.renderFn) {
          td.append(mapping.renderFn(value, mapping, rec));
        }
        else if (mapping.appendFn) {
          td.append(mapping.appendFn(value, mapping, rec).html());
        }
        else {
          td.append(value.toString());
        }

        row.append(td);
      });
      return row;
    });
  };

  return self;
};

EasyApi.Dom.button = EasyApi.Dom.button || function(id) {
  var self = {};

  self.node = $('#' + id);
  if (self.node.length === 0) {
    self.node = $('<button id="' + id + '">');
  }

  return self;
};

EasyApi.Dom.selectList = EasyApi.Dom.selectList || function (id) {
  var self = {};

  self.node = $('#' + id);
  if (self.node.length === 0) {
    self.node = $('<select id="' + id + '">');
  }


  self.appendOption = function (opt) {
    var optionVal = typeof(opt) === "string" ? opt : opt.val,
        optionText = typeof(opt) === "string" ? opt : opt.text;
    self.node.append(
      $('<option value="' + optionVal + '">' + optionText + '</option>'));
    return self;
  };

  self.setOptions = function (opts, createOptFn) {
    self.node.empty();
    EasyApi.forEach(opts, function (opt) {
      if (createOptFn !== undefined) {
        self.appendOption(createOptFn(opt));
      } else {
        self.appendOption(opt);
      }
    });
    return self;
  };

  self.onChange = function (handlerFn) {
    self.node.change(handlerFn); 
    return self;
  };

  self.html = function () {
    return self.node.html();
  };

  return self;
};

EasyApi.Dom.input = EasyApi.Dom.input || function (id) {
  var self = {};

  self.node = $('#' + id);
  if (self.node.length === 0) {
    self.node = $('<input id="' + id + '">');
  }

  self.html = function () {
    return self.node.html();
  };

  self.value = function (theVal) {
    if (theVal !== undefined) {
      self.node.val(theVal);
      return self;
    }
    return self.node.val();
  };

  self.name = function (theName) {
    if(theName !== undefined) {
      self.node.attr('name', theName);
      return self;
    } 
    return self.node.attr('name');
  };

  return self;
};

/**
 * Wrapper for perfoming all Ajax Calls to the api
 * NB: Session handling is handled within this automatically.
 *
 * @param {string} requestMethod the request method: POST, PUT,
 *                        DELETE (NOT: HEAD, OPTIONS).
 * @param {string} url the url .
 * @param {array} attrs list of attribute getter / setters to
 *                be automatically added to the api request.
 * @return {object} new ApiRequest.
 */
EasyApi.ApiRequest = function (requestMethod, url, attrs) {
  var req = {}, validMethods, makeAttrSetter, onFailure, onSuccess;
  requestMethod = requestMethod.toUpperCase();

  validMethods = {POST: true, GET: true, PUT: true, DELETE: true, HEAD: true, OPTIONS:  true};

  if (validMethods[requestMethod] === undefined) {
    throw ('Error: unrecognized request method constructing EasyApi.ApiRequest: "' + requestMethod + '"');
  }

  req.XHRHeaders = {};
  req.requestDone = false;
  req._requestMethod = requestMethod;
  req._url = url;
  req._data = {};
  req.handlers = {
    onFailure:
      function () {
        console.log('ajax failure for ' + requestMethod + ', ' + req._url);
      },
    onSuccess:
      function () {
        console.log('ajax success for ' + requestMethod + ', ' + req._url);
      },
    onProtocolSuccess:
      function (data) {
        var status;
        if (data) {
          status = data.status;
        }
        status = status || 'UNKNOWN STATUS';
        try {
          if (status && req.handlers.statusCodes[status] && req.handlers.statusCodes[status].length > 0) {
            EasyApi.forEach(req.handlers.statusCodes[status], function (cb) {
              cb(data);
            });
            return true;
          }
          if (req.handlers.statusCodes['*'] && req.handlers.statusCodes['*'].length > 0) {
            EasyApi.forEach(req.handlers.statusCodes['*'], function (cb) {
              cb(data);
            });
            return true;
          }
        }
        catch (e) {
          EasyApi.lastError = e;
          console.error(e.toString());
          console.error(e.stack);
          return;
        }
        throw ('No onProtocolSuccess or onStatus handler for: ' + data.status);
      },
    onAuthorizationFailure:
      function () {
        console.log('authorization failure for: ' + requestMethod + ' => ' + req._url);
      },
    doAfter: {},
    statusCodes: {}
  };

  req.doJson = false;

  // Ability for code to apply callbacks.

  attrs = attrs || [];
  EasyApi.forEach(url.match(new RegExp(/@@[^@]+@@/g)), function (a) {
    var varName = a.replace(/@/g, '');
    if (-1 === $.inArray(varName, attrs)) {
      attrs.push(varName);
    }
  });

  makeAttrSetter = function (req, attr) {
    return function (d) {
      req._data[attr] = d;
      return req;
    };
  };

  (function (req, attrs) {
    var ii, attr;
    for (ii = 0; ii < attrs.length; ii += 1) {
      attr = attrs[ii];
      req[attr] = makeAttrSetter(req, attr);
    }
    return req;
  }(req, attrs));

  req.onProtocolSuccess = function (cb) {
    req.handlers.onProtocolSuccess = cb;
    return req;
  };

  req.onAuthorizationFailure = function (fn) {
    req.handlers.onAuthorizationFailure = fn;
    return this;
  };
  req.onFailure = function (cb) {
    req.handlers.onFailure = cb;
    return req;
  };

  req.url = function (d) {
    req._url = d;
    return req;
  };

  req.authorizationFailed = function (data) {
    if (data !== undefined &&
        data.status !== undefined &&
        data.status === 401) {
      return true;
    }
    return false;
  };

  onFailure = function (response) {
    req.requestDone = true;
    return req.handlers.onFailure(response);
  };

  onSuccess = function (response) {
    req.requestDone = true;

    if (req.authorizationFailed(response)) {
      return req.handlers.onAuthorizationFailure(response);
    }
    return req.handlers.onProtocolSuccess(response);
  };

  req.run = function (doAsync) {
    var body = null, resp, ajaxParams, rndTime;

    if (typeof doAsync === 'undefined') {
      doAsync = true;
    }

    EasyApi.forEach(attrs, function (attr) {
      var pattern = "@@" + attr + "@@",
          val = req._data[attr];
      if (-1 !== req._url.indexOf(pattern) && val) {
        req._url = req._url.replace(pattern, val);
        delete req._data[attr];
      }
    });

    if (req._url.match(/@@/)) {
      resp = {};
      console.error('Error for request %s found @@ in url', req._url);
      resp.target = {};
      resp.target.getResponseJson = function () {
        return {
          status:  'BadRequest',
          message: 'Error for request, found @@ in url'
        };
      };
      return onSuccess(req, resp);
    }

    ajaxParams = { 
      type : req._requestMethod,
      url  : req._url,
      success :  onSuccess,
      error : onFailure,
      async : doAsync,
      data : {}
    };

    rndTime = new Date().getTime();
    if (req._requestMethod === 'GET') {
      ajaxParams.data      = req._data;
      ajaxParams.data.rnd  = rndTime;
    }
    else if (req._requestMethod === 'POST' || req._requestMethod === 'PUT') {
      ajaxParams.url = ajaxParams.url + '?rnd=' + rndTime;
      if (req.doJson) {
        ajaxParams.dataType    = 'json';
        ajaxParams.contentType = 'application/json'; 
        ajaxParams.data        =  JSON.stringify(req._data); 
      }
      else {
        ajaxParams.data        = req._data;
        ajaxParams.contentType = 'application/x-www-form-urlencoded';
      }
    }
    else {
      req._url = req._url + '?rnd=' + rndTime;
    }

    $.ajax(ajaxParams);
  };

  req.syncRun = function () {
    req.run(false);
  };

  req.addHeader = function (key, value) {
    req.XHRHeaders[key] = value;
    return req;
  };
  req.doJson = function () {
    req.doJson = true;
    return req;
  };
  req.param = function (k, v) {
    req._data[k] = v;
    return req;
  };
  req.getData = function () {
    return req._data;
  };
  req.onStatus = function (st, fn) { 
    req.handlers.statusCodes[st] = req.handlers.statusCodes[st] || [];
    req.handlers.statusCodes[st].push(fn);
    return req;
  };
  req.renderOn = function (st, view, selector) {
    selector = selector || 'main-content';
    req.handlers.statusCodes[st] = req.handlers.statusCodes[st] || [];
    req.handlers.statusCodes[st].push(function (data) {
      EasyApi.renderPartialInto(view, selector, data);

      if (req.handlers.doAfter[st]) {
        EasyApi.forEach(req.handlers.doAfter[st], function (cb) { 
          cb(data);
        });
      }
    });
    return req;
  };
  req.doAfter = function (st, cb) {
    var cbs = req.handlers.doAfter[st] = req.handlers.doAfter[st] || [];
    cbs.push(cb);
    return req;
  };

  req.fromForm = function (selector) {
    EasyApi.forEach($(selector).serializeArray(), function (dat) {
      var property = dat.name;
      if (req[property]) {
        req[property](dat.value);
      }
    });
    return req;
  };


  return req;
};

