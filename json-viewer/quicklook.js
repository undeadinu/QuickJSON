var JSONFormatter = (function() {
  var toString = Object.prototype.toString, re =
    // This regex attempts to match a JSONP structure (ws includes Unicode ws)
    // * optional leading ws
    // * callback name (any valid function name as per ECMA-262 Edition 3 specs)
    // * optional ws
    // * open parenthesis
    // * optional ws
    // * either { or [, the only two valid characters to start a JSON string
    // * any character, any number of times
    // * either } or ], the only two valid closing characters of a JSON string
    // * optional trailing ws and semicolon
    // (this of course misses anything that has comments, more than one callback
    // -- or otherwise requires modification before use by a proper JSON parser)
    /^[\s\u200B\uFEFF]*([\w$\[\]\.]+)[\s\u200B\uFEFF]*\([\s\u200B\uFEFF]*([\[{][\s\S]*[\]}])[\s\u200B\uFEFF]*\)([\s\u200B\uFEFF;]*)$/m;

  function detectJSONP(s) {
    var js = s, cb = '', se = '', match;
    if ('string' !== typeof s) return wrapJSONP(s, cb, se);
    if ((match = re.exec(s)) && 4 === match.length) {
      cb = match[1];
      js = match[2];
      se = match[3].replace(/[^;]+/g, '');
    }

    try {
      return wrapJSONP(JSON.parse(js), cb, se);
    }
    catch (e) {
      return error(e, s);
    }
  }

  // Convert a JSON value / JSONP response into a formatted HTML document
  function wrapJSONP(val, callback, semicolon) {
    var output = span(value(val, callback ? '' : null, callback && '<br\n/>'),
                      'json');
    if (callback)
      output = span(callback +'(', 'callback') + output +
               span(')'+ semicolon, 'callback');
    return output;
  }

  // utility functions

  function isArray(obj) {
    return '[object Array]' === toString.call(obj);
  }

  // Wrap a fragment in a span of class className
  function span(html, className) {
    return '<span class=\''+ className +'\'>'+ html +'</span>';
  }

  // Produce an error document for when parsing fails
  function error(e, data) {
    return span('Error parsing JSON: '+ e, 'error') +'<h1>Content:</h1>'+
           span(html(data), 'json');
  }

  // escaping functions

  function html(s, isAttribute) {
    if (s == null) return '';
    s = (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return isAttribute ? s.replace(/'/g, '&apos;') : s;
  }

  var js = JSON.stringify('\b\f\n\r\t').length === 12 ?
    function saneJSEscaper(s, noQuotes) {
      s = html(JSON.stringify(s).slice(1, -1));
      return noQuotes ? s : '&quot;'+ s +'&quot;';
    }
  : function insaneEscaper(s, noQuotes) {
    // undo all damage of an \uXXXX-tastic Mozilla JSON serializer
    var had = { '\b': 'b' // return
              , '\f': 'f' // these
              , '\r': 'r' // to the
              , '\n': 'n' // tidy
              , '\t': 't' // form
              }, ws;      // below
    for (ws in had)
      if (-1 === s.indexOf(ws))
        delete had[ws];

    s = JSON.stringify(s).slice(1, -1);

    for (ws in had)
      s = s.replace(new RegExp('\\\\u000'+(ws.charCodeAt().toString(16)), 'ig'),
                    '\\'+ had[ws]);

    s = html(s);
    return noQuotes ? s : '&quot;'+ s +'&quot;';
  };

  // conversion functions

  // Convert JSON value (Boolean, Number, String, Array, Object, null)
  // into an HTML fragment
  function value(v, indent, nl) {
    var output;
    switch (typeof v) {
      case 'boolean':
        output = span(html(v), 'bool');
      break;

      case 'number':
        output = span(html(v), 'num');
      break;

      case 'string':
        if (/^(\w+):\/\/[^\s]+$/i.test(v)) {
          output = '&quot;<a href=\''+ html(v, !!'attribute') +'\'>' +
                     js(v, 1) +
                   '</a>&quot;';
        } else {
          output = span(js(v), 'string');
        }
      break;

      case 'object':
        if (null === v) {
          output = span('null', 'null');
        } else {
          indent = indent == null ? '' : indent +'&nbsp; ';
          if (isArray(v)) {
            output = array(v, indent, nl);
          } else {
            output = object(v, indent, nl);
          }
        }
      break;
    }
    return output;
  }

  // Convert an Object to an HTML fragment
  function object(obj, indent, nl) {
    var output = '';
    for (var key in obj) {
      if (output) output += '<br\n/>'+ indent +', ';
      output += span(js(key), 'prop') +': ' +
        value(obj[key], indent, '<br\n/>');
    }
    if (!output) return '{}';
    return '<span class=\'unfolded obj\'><span class=content>' +
             (nl ? nl + indent : '') +'{ '+ output +'<br\n/>' +
                              indent +'}</span></span>';
  }

  // Convert an Array into an HTML fragment
  function array(a, indent, nl) {
    for (var i = 0, output = ''; i < a.length; i++) {
      if (output) output += '<br\n/>'+ indent +', ';
      output += value(a[i], indent, '');
    }
    if (!output) return '[]';
    return '<span class=\'unfolded array\'><span class=content>' +
             (nl ? nl + indent : '') +'[ '+ output +'<br\n/>' +
                              indent +']</span></span>';
  }

  // Takes a string of JSON and returns a string of HTML.
  // Be sure to call JSONFormatter.init(document) once, too (for styling / UX).
  function JSONFormatter(s) {
    return detectJSONP(s);
  }

  // Pass the document that you render the HTML into, to set up css and events.
  JSONFormatter.init = function init(doc, css) {
    doc = doc || document;
    var head = doc.getElementsByTagName('head')[0] || doc.documentElement
      , node = doc.getElementById('json-format') || doc.createElement('style');
    if (node.id) return; else node.id = 'json-format';
    node.textContent = css || ('.prop{font-weight:700;}.null{color:red;}.bool,.num{color:blue;}.string{color:green;white-space:pre-wrap;}.error{-moz-border-radius:8px;border:1px solid #970000;background-color:#F7E8E8;margin:.5em;padding:.5em;}.json{white-space:pre-wrap;font-family:monospace;font-size:1.1em;}h1{font-size:1.2em;}.callback{font-family:monospace;color:#A52A2A;}.folded *{position:absolute;color:transparent;height:0;width:0;outline:5px solid red;white-space:normal;top:-100000cm;left:-100000cm;}*.folded.array:before{content:"[\\002026 ]";/* [...] */}.folded.obj:before{content:"{\\002026 }";/* {...} */}.callback+.json>.folded:after{content:"";}.folded:after{content:"                                                             ";}.folded{background:#FFF;}.folded:hover{background:rgba(255,192,203,0.5);}.folded{cursor:se-resize;}.unfolded.hovered{background:rgba(255,192,203,0.5);}.unfolded{cursor:nw-resize;}');
    head.appendChild(node);
    doc.addEventListener('click', function folding(e) {
      var elem = e.target, is, is_json = elem;
      while (is_json && is_json.className != 'json')
        is_json = is_json.parentNode;
      if (!is_json) return; // only do folding/unfolding on json nodes

      do {
        if (/^a$/i.test(elem.nodeName)) return;
        is = elem.className || '';
      } while (!/\b(un)?folded /.test(is) && (elem = elem.parentNode));
      if (elem) {
        elem.className = /unfolded /.test(is)
          ? is.replace('unfolded ', 'folded ')
          : is.replace('folded ', 'unfolded ');
      }
    }, false);
  };

  return JSONFormatter;
})();
