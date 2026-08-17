function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function mockReq({ params = {}, query = {}, body = {} } = {}) {
  return { params, query, body };
}

async function invoke(handler, req, res = mockRes()) {
  await new Promise((resolve, reject) => {
    const next = (err) => (err ? reject(err) : resolve());
    Promise.resolve(handler(req, res, next)).then(resolve).catch(reject);
  });
  return res;
}

function fakePool() {
  return {
    async connect() {
      return {
        query: async () => ({ rows: [] }),
        release() {},
      };
    },
  };
}

/** Transactional pool that commits unless the callback throws. */
function txPool() {
  const client = {
    queries: [],
    async query(sql) {
      this.queries.push(sql);
      return { rows: [] };
    },
    release() {},
  };
  return {
    client,
    async connect() {
      return client;
    },
  };
}

module.exports = { mockRes, mockReq, invoke, fakePool, txPool };
