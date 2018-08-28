/* jshint esversion: 6 */

var Crawl = require('crawler');
const url = require('url');
var fs = require('fs');

class Crawler {

  constructor(cb, end_cb, limit, rateLimit = 2000) {
    this.limit = limit || 0;
    this.uris = new Set()
    this.crawler = new Crawl({
      rateLimit : rateLimit,
      //maxConnections : 10,
      userAgent : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
      referer : false,

      // This will be called for each crawled page.
      callback: (error, res, done) => {
        if (error) {
          console.error(error);
          return done();
        }

        const uri = res.request.uri;
        const hostname = uri.hostname;

        if (res.statusCode != 200) {
          console.error('Error: HTTP ' + res.statusCode + ', URL: ' + uri.href);
          return done();
        }

        // Ensure this is an HTML page. XML pages make a mess of this
        if (!res.headers['content-type'].startsWith('text/html')) {
          return done();
        }

        // user provided callback
        cb(uri, res)

        // $ is Cheerio
        const $ = res.$;

        // Find all the links on the page.
        $('a').each((i, elem) => {
          let href = $(elem).attr('href');
          let rel = $(elem).attr('rel');

          // Skip over malformed URLs, fragment only URLs, and email links
          if (href === undefined
            || href == ''
            || href.startsWith('#')
            || href.startsWith('mailto:')
            || href.startsWith('javascript:')
            || href.startsWith('tel:')
            ) {
            return;
          }

          // Don't crawl nofollow links (e.g. facets).
          if (rel == 'nofollow') {
            return;
          }

          // The href without the fragement.
          href = href.split('#')[0];

          // There could be absolute links.
          var linkedURL = null;
          if (href.startsWith('http')) {
            linkedURL = url.parse(href);
          } else {
            var base = $('base').attr('href');
            if (base !== undefined) {
              linkedURL = url.parse(url.resolve(base, href));
            } else {
              linkedURL = url.parse(uri.resolve(href));
            }
          }

          // Ensure we are on the same domain and we have not already seen this uri
          if (linkedURL.hostname == hostname && !this.uris.has(linkedURL.href)) {

            // We don't want to crawl static files.
            if ((/\.(xml|pdf|png|gif|jpe?g|svg|tiff|bmp|raw|webp|docx?|xlsx?|pptx?|swf|flv|cgi|dll|exe|cfm|ttf|bat|ics|rtf)$/i).test(href)) {
              return;
            }

            // Crawl more.
            this.uris.add(linkedURL.href);
            if (this.limit === 0) {
              this.crawler.queue(linkedURL.href);
            }
            else if (this.limit > 0 && this.uris.size < this.limit) {
              this.crawler.queue(linkedURL.href);
            }
          } else {
            // ignore
            return;
          }
        });
        done();
      }
    });

    if (end_cb) {
      crawler.on('drain', end_cb)
    }
  }

  add_site(domain) {
    const link = url.parse(domain)
    this.uris.add(link.path);
    this.crawler.queue(domain);
  }
}

module.exports = Crawler;
