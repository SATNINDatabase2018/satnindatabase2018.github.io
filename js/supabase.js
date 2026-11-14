const SUPABASE_URL = "https://nfwkufefochrvhieyhgc.supabase.co";
const SUPABASE_KEY = "sb_publishable_mGzBs7_KjDk9kEgjaBRewQ_rRKlebqW";

let supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* Page-local request sharing. Never persist account data or cache writes. */
(() => {
  const client = supabaseClient;
  const getUser = client.auth.getUser.bind(client.auth);
  const rpc = client.rpc.bind(client);
  let userFlight = null, epoch = 0;
  const adminChecks = new Map();
  client.auth.onAuthStateChange(() => {
    epoch++;
    userFlight = null;
    adminChecks.clear();
  });
  client.auth.getUser = function (...args) {
    // Explicit JWT checks must remain independent.
    if (args.length) return getUser(...args);
    if (!userFlight) {
      const pending = getUser();
      userFlight = pending;
      pending.finally(() => { if (userFlight === pending) userFlight = null; }).catch(() => {});
    }
    return userFlight;
  };
  client.rpc = async function (name, ...args) {
    if (name !== 'hm_is_admin' || args.length) return rpc(name, ...args);
    const generation = epoch;
    const {data, error} = await client.auth.getSession();
    if (error) return {data: null, error};
    if (generation !== epoch) return client.rpc(name);
    const session = data?.session;
    if (!session?.user) return {data: false, error: null};
    // Include the token so switching accounts cannot reuse another user's result.
    const key = session.access_token;
    const previous = adminChecks.get(key);
    if (previous && previous.expires > Date.now()) return previous.promise;
    const entry = {expires: Date.now() + 30000};
    entry.promise = rpc(name).then(result => {
      if (generation !== epoch) return client.rpc(name);
      if (result.error && adminChecks.get(key) === entry) adminChecks.delete(key);
      return result;
    }, error => {
      if (adminChecks.get(key) === entry) adminChecks.delete(key);
      throw error;
    });
    adminChecks.set(key, entry);
    return entry.promise;
  };
})();
