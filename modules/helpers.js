
var marked = require('marked');
var eco = require('eco');
var extend = require('extend');
var fs = require('fs');
var moment = require('moment');
var htmlstrip = require('htmlstrip-native').html_strip;
var slug = require('slug');
var escape = require('escape-html');
var stripIndent = require('strip-indent');
var htmlIntro = require('./html-intro');
var htmlExcerpts = require('./html-excerpt');

marked.setOptions({
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: true
});

var renderPatternName = function(name) {
  name = name.replace(/\.html$/, '');
  name = name.replace(/_/g, ' ');
  name = name.replace(/ (\w)/g, function(str, head) {
    return ' ' + head.toUpperCase();
  });
  name = name.substr(0, 1).toUpperCase() + name.substr(1, name.length);
  return name;
};

module.exports = function() {
  return function(files, metalsmith, done) {

    for (var path in files) {
      files[path].origPath = path;
    }

    var helpers = {
      partial: function(name, params) {
        try {
          var path = metalsmith.path('src/partials', name);
          var partialContents = require('fs').readFileSync(path);
          var context = params ? extend({}, params, this) : extend({}, this);
          return eco.render(partialContents.toString('utf8'), context);
        } catch (e) {
          return e.toString();
        }
      },

      renderPatternName: renderPatternName,

      slug: function(name) {
        return slug(name);
      },

      dump: function(param) {
        return JSON.stringify(param, null, '  ');
      },

      dumpKeys: function(param) {
        return JSON.stringify(Object.keys(param), null, '  ');
      },

      titlize: function(str) {
        str = '' + str;
        if (str.length <= 1) {
          return str.toUpperCase();
        }

        return str.substr(0, 1).toUpperCase() + str.substr(1, str.length);
      },

      renderBlogDate: function(date) {
        var date = moment(date);
        var result = date.format('dddd, MMMM Do, YYYY').toUpperCase();
        return result;
      },

      renderBlogDateShort: function(date) {
        var date = moment(date);
        var result = date.format('YYYY-MM-DD');
        return result;
      },

      getAbstractText: function(contents) {
        var options = {
          include_script: false,
          include_style: false,
          compact_whitespace: false,
          include_attributes: false
        };
        return htmlstrip(contents.toString('utf8'), options).slice(0, 400) + '...';
      },

      markdown: function(capture) {
        try {
          return marked(capture().toString());
        } catch(e) {
          return e.toString();
        }
      },

      /**
       * highlighter 
       */
      highlight: function(capture, language) {
        var code = stripIndent(capture().toString()).trim();
        var extra = language ? ' class="' + language + '"' : '';
        try {
          return '<pre class="css-component-highlight"><code' + extra + '>' +
            escape(code) + '</code></pre>';
        } catch(e) {
          return e.toString();
        }
      },

      cssShowcase: function(capture) {
        try {
          return '<div class="css-component-showcase ons-css">' + 
            '<div class="page css-component-showcase-inner" style="position: static; height: 568px;">' +
            capture().toString() + '</div></div>';
        } catch(e) {
          return e.toString();
        }
      },

      /**
       * @param {Object} [options]
       * @param {String} [options.minHeight]
       * @param {Boolean} [options.wrapPage]
       * @param {Function} capture
       */
      cssExample: function(options, capture) {
        if (arguments.length <= 1) {
          capture = options;
          options = {};
        }

        var extraAttributes = '';
        if (options.minHeight) { 
          extraAttributes += ' style="min-height: ' + options.minHeight + 'px"';
        }

        var wrapStart = '';
        var wrapEnd = '';
        if (options.wrapPage) {
          wrapStart = '<div class="page" style="border: 1px solid #ddd">';
          wrapEnd = '</div>';
        }

        try {
          return '<div class="css-component-example" ' +
            extraAttributes + '><div class="ons-css">' +
            wrapStart + capture().toString() + wrapEnd +
           '</div></div>\n' + this.highlight(capture, 'html');
        } catch(e) {
          return e.toString();
        }
      },

      getPreparedTitle: function() {
        return this.title ? this.title + ' | Onsen' : this.site.title;
      },

      getPreparedDescription: function() {
        return this.description || this.site.description;
      },

      getPreparedKeywords: function() {
        return this.site.keywords;
      },

      getShortenedTitle: function(title, len) {
        if (title.length > len) {
          return title.substr(0, len - 3).trim() + '...';
        }
        else {
          return title;
        }
      },

      fileExist: function(path) {
        return fs.existsSync(path);
      },

      renderArticleIntroAsHTML: function(html) {
        return htmlIntro(html);
      },

      renderArticleIntroAsText: function(html) {
        return htmlExcerpts(html, 200);
      },

      hasAlternateLangPage: function() {
        if (metalsmith.metadata().isBlog) {
          return false;
        }

        var alternateLang = this.lang === 'en' ? 'ja' : 'en';
        var alternatePath = metalsmith.source().replace(/_(en|ja)$/, '_' + alternateLang) + '/' + this.origPath;

        return fs.existsSync(alternatePath);
      },

      getAlternateLangPage: function() {
        var url = this.lang === 'en' ? 'http://ja.onsen.io' : 'http://onsen.io';
        return url + '/' + this.origPath;
      },

      getAlternateLang: function() {
        return this.lang === 'en' ? 'ja' : 'en';
      }
    };

    extend(metalsmith.metadata(), helpers);
    done();
  };
};

module.exports.renderPatternName = renderPatternName;
