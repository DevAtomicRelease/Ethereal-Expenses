import { getAccessToken } from "./tokenManager";
import { API_BASE_URL } from "./config";

type EventHandler = (data: any) => void;

class AtomicShiftWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, EventHandler[]>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async connect() {
    const wsUrl = API_BASE_URL.replace(/^https/, "wss").replace(/^http/, "ws") + "/ws";
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = async () => {
      const token = await getAccessToken();
      if (token) this.ws?.send(JSON.stringify({ token }));
    };
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handlers.get(msg.event)?.forEach((h) => h(msg.data));
      } catch {}
    };
    this.ws.onclose = () => { this.reconnectTimer = setTimeout(() => this.connect(), 5000); };
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }
  off(event: string, handler: EventHandler) {
    const list = this.handlers.get(event);
    if (list) this.handlers.set(event, list.filter((h) => h !== handler));
  }
  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close(); this.ws = null;
  }
}

export const wsClient = new AtomicShiftWebSocket();
