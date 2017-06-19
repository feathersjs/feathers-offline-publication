
const assert = require('chai').assert;
const feathers = require('feathers');
const memory = require('feathers-memory');
const hooks = require('feathers-hooks');
const socketio = require('feathers-socketio');

const { clientConfigure, clientTest } = require('./helpers/client');
const commonPublications = require('../src/common-publications');
const serverPublications = require('../src/server');

describe('integration', () => {
  let app;
  let server;
  let feathersClient;
  
  beforeEach(done => {
    // configure Feathers on server
    app = feathers()
      .configure(hooks())
      .configure(socketio())
      .configure(services1);
    
    // start server
    server = app.listen(3030);
    server.on('listening', () => {
      
      // configure server publications support
      serverPublications(app, commonPublications, 'messages');
  
      // configure Feathers on client
      feathersClient = clientConfigure();
      
      done();
    });
  });
  
  afterEach(() => {
    server.close();
  });

  it('adds publication', done => {
    // event signals end of processing
    feathersClient.io.on('_testing', data => {
      
      assert.deepEqual(data, {
        source: 'addPublication',
        serviceName: 'messages',
        name: 'query',
        params: [{ dept: 'acct' }],
        ifServer: true,
        checkBefore: false,
        store: { ifServer: true, checkBefore: false }
      });
      
      done();
    });
    
    // run test function on client
    const filter = clientTest((feathersClient, publicationClient) => {
      return publicationClient.addPublication(feathersClient, 'messages', {
        module: commonPublications,
        name: 'query',
        params: { dept: 'acct' },
        ifServer: true,
        checkBefore: false,
      });
    });
    
    // check filter function returned on client
    assert.isFunction(filter);
    assert.isTrue(filter({ dept: 'acct' }));
    assert.isFalse(filter({ dept: 'xacct' }));
  });
  
  it('removes publication', done => {
    // event signals end of processing
    feathersClient.io.on('_testing', data => {
      
      if (data.source === 'addPublication') {
        // remove publication
        clientTest((feathersClient, publicationClient) => {
          return publicationClient.removePublication(feathersClient, 'messages');
        });
      } else {
        assert.deepEqual(data, {
          source: 'removePublication',
          serviceName: 'messages',
          keys: [],
        });
  
        done();
      }
    });
    
    // add publication
    const filter = clientTest((feathersClient, publicationClient) => {
      return publicationClient.addPublication(feathersClient, 'messages', {
        module: commonPublications,
        name: 'query',
        params: { dept: 'acct' },
        ifServer: true,
        checkBefore: false,
      });
    });
  });

  it('filters mutations', done => {
    const messages = app.service('messages');
    let eventCount = 1;
    
    // event signals end of processing
    feathersClient.io.on('_testing', data => {
      messages.create({ name: 'john', dept: 'acct' })
        .then(() => {
         
        });
    });
    
    feathersClient.service('messages').on('created', data => {
      console.log('>>>created');
      console.log(data);
      done();
    });
    
    // run test function on client
    const filter = clientTest((feathersClient, publicationClient) => {
      return publicationClient.addPublication(feathersClient, 'messages', {
        module: commonPublications,
        name: 'query',
        params: { dept: 'acct' },
        ifServer: true,
        checkBefore: false,
      });
    });
  });
});

// Helpers

function services1 () {
  const app = this;
  app.configure(messages)
}

function messages () {
  const app = this;
  app.use('/messages', memory({}));
}

function clone (obj) {
  return JSON.parse(JSON.stringify(obj));
}
