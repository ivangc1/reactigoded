using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [ (name = "main", worker = .mainWorker) ],
  sockets = [ (name = "http", address = "127.0.0.1:0", http = (), service = "main") ]
);

const mainWorker :Workerd.Worker = (
  modules = [ (name = "worker.js", esModule = embed "worker.js") ],
  # Mantener en sync con COMPAT_DATE en run.mjs (parte de la premisa pineada). codex P2.
  compatibilityDate = "2026-07-17",
);
