[![MIT License][license-image]][license-url]

[![Support](https://www.totaljs.com/img/button-support.png?v=2)](https://www.totaljs.com/support/)

# Installation

- Install [__Node.js__ platform](https://www.nodejs.org)
- Install [__GraphicsMagick__](http://www.graphicsmagick.org)
- Install latest version of Total.js `$ npm install total.js`
- __License__: [MIT](license.txt)
- [__Live chat with professional support__](https://messenger.totaljs.com)
- [__HelpDesk with professional support__](https://helpdesk.totaljs.com)

## First start

- set up configuration file `/config`
- run `$ node debug.js` (development) or `$ node release.js` (production)
- open `http://127.0.0.1:8000/`
- sign in __user:__ `info@totaljs.com`, __password:__ `123456` (credentials are stored in `/databases/users.json`)

## How do I translate Messenger?

- install Total.js as global module `npm install -g total.js`
- then open Messenger directory `cd messenger`
- then perform this command `totaljs --translate`
- translate translated file `translate.resource`
- and copy the content to `/resources/default.resource`
- run app

## How can I extend messenger independently?

### Server-side

```javascript
F.on('messenger.open', function(controller, client) {
    // open client
});

F.on('messenger.close', function(controller, client) {
    // disconnected client
});

F.on('messenger.data', function(controller, client, data) {
    // RAW data from websocket
    // data === OBJECT
});

F.on('messenger.message', function(controller, client, message) {
    // New message
    // message === OBJECT
});

// How to send a message?
options = {};

// REQUIRED
options.iduser = 'ID USER WHICH SENDS MESSAGE';
options.target = 'channel'; // or "user"
options.idtarget = 'idchannel' // or "iduser"
options.body = 'MARKDOWN MESSAGE'; // how to perform like? just send ":thumbs-up:" in body
options.secret = false; // is the message a secret message?

// OPTIONAL
options.id = 'ID MESSAGE'; // for editing of an existing message
options.users = ['iduser1', 'iduser2']; // optional, which users can by notified? (works with channels only)
options.files = [{ name: 'filename', url: 'url to download' }]; // optional, (it serves for file browser only)

OPERATION('send', options, function(err, response) {
    console.log('DONE');
});
```

### Client-side

```javascript
ON('messager.ready', function() {
    // messenger is ready
});

ON('messenger.message', function(message) {
    // message === OBJECT
});

ON('messenger.send', function(message) {

});

// You can register event
ON('messenger.render', function(message) {
    // message.message  - instance of retrieved message
    // message.html     - rendered HTML (can be modified)

    // Example:
    message.html = message.html.replace(/\,/g, ' --- ');
});

// How to send a message to the server via WebSocket?
SETTER('websocket', 'send', OBJECT);
```

## HTML Formatting

`+v2.0.0`. Administrators have disabled `xss` protection, so each admin can inject a raw HTML into the markdown directly, example:

```markdown
Only administrators can inject HTML directly via:

\```xss
 <b>THIS WILL BE BOLDED</b>
\```
```

## Contributors

- Peter Širka (author) <petersirka@gmail.com>
- Martin Smola (support) <smola.martin@gmail.com>

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt
