use std::sync::Arc;

use librqbit::{ListenerMode, ListenerOptions, ManagedTorrent, Session, SessionOptions};
use tokio::sync::{Mutex, OnceCell};

use crate::services::library::app_database_dir;

pub type Handle = Arc<ManagedTorrent>;

static SESSION: OnceCell<Arc<Session>> = OnceCell::const_new();

/// Currently active torrent handle (this app only ever drives one download at a time).
pub static ACTIVE_HANDLE: Mutex<Option<Handle>> = Mutex::const_new(None);

async fn init_session() -> Result<Arc<Session>, String> {
    let base_dir = app_database_dir()?.join("torrent-session");
    // `Session::new` leaves `listen` unset, which skips creating a uTP socket entirely —
    // that socket is also what outbound uTP connections use, so without it every peer
    // reachable only via uTP (most NAT'd swarm members) is unreachable and we never
    // accept incoming TCP either. Mirror what full clients (libtorrent, qBittorrent) do
    // by default: listen on both TCP and uTP, and try to punch a UPnP port forward.
    let opts = SessionOptions {
        listen: Some(ListenerOptions {
            mode: ListenerMode::TcpAndUtp,
            enable_upnp_port_forwarding: true,
            ..Default::default()
        }),
        ..Default::default()
    };
    Session::new_with_opts(base_dir, opts).await.map_err(|e| e.to_string())
}

/// Lazily starts (once) and returns the shared libtorrent-equivalent session.
pub async fn session() -> Result<Arc<Session>, String> {
    SESSION.get_or_try_init(init_session).await.map(Arc::clone)
}
