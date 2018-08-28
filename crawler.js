const Crawler = require('./lib/crawler');
const extractor = require('unfluff');
const algoliasearch = require('algoliasearch');

const URL_TO_INDEX = 'https://www.example.com';
const ALGOLIA_APPLICATION_ID = 'xxxxxxxxxx';
const ALGOLIA_API_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const ALGOLIA_INDEX_NAME = 'xxxxxx';
const ALGOLIA_CHUNK_SIZE = 2000;


const base_url = URL_TO_INDEX;
const client = algoliasearch(ALGOLIA_APPLICATION_ID, ALGOLIA_API_KEY);
const index = client.initIndex(ALGOLIA_INDEX_NAME);

function chunkSplit(input, len) {
  var curr = len;
  var prev = 0;

  output = [];

  while (input[curr]) {
      if (input[curr++] == ' ') {
          output.push(input.substring(prev,curr));
          prev = curr;
          curr += len;
      }
  }
  output.push(input.substr(prev));

  return output;
}

const crawler = new Crawler(async (uri, response) => {
  const page = [];
  const data = extractor(response.body);
  console.log(data);
  const data_index = {
    site: base_url,
    path: uri.path,
    unique: base_url + uri.path,
    title: data.title,
    language: data.lang
  }
  const chunks = chunkSplit(data.text, ALGOLIA_CHUNK_SIZE);

  var i = 0;
  for (let chunk of chunks) {
    page.push({...data_index, text: chunk, index: i});
    i++;
  }
  index.addObjects(page)
  console.log('Added: ' + base_url + uri.path)
});

crawler.add_site(base_url);
