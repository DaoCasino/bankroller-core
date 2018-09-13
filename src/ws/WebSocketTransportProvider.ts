import {
  IMessagingProvider,
  ISharedRoom,
  RoomInfo,
  RequestMessage,
  IRemoteInterface,
  ResponseMessage
} from "../dapps/Interfaces";
import ws from "ws";
import { RemoteProxy, getId } from "../RemoteProxy";
import { ServiceWrapper } from "../ServiceWrapper";

class WebsocketTransportProvider {
  private _wsMap: Map<string, any>;
  peerId: string;
  private _wsStartPromise;
  private constructor() {
    this._wsMap = new Map();
  }
  private _getClient(address: string): any {
    let client = this._wsMap.get(address);
    if (!client) {
      client = ws.Client(address, {});
      client.this._wsMap.set(address, client);
    }
    return client;
  }
  private _getServer(address: string): any {
    let client = this._wsMap.get(address);
    if (!client) {
      client = ws.Server(address, {});
      client.this._wsMap.set(address, client);
    }
    return client;
  }
  getSharedRoom(gameId: string, onConnect: (data: any) => void): ISharedRoom {
    if (this.sharedRoom) return this.sharedRoom;
    const ipfsRoom = this._getIpfsRoom(gameId);
    this.sharedRoom = new IPFSSharedRoom(ipfsRoom, gameId, onConnect);
    return this.sharedRoom;
  }
  getRemoteInterface<TRemoteInterface>(
    address: string,
    roomInfo?: RoomInfo
  ): TRemoteInterface {
    const client = new ws.Client(address);

    const proxy = new RemoteProxy();
    const self = this;
    client.on("message", message => {
      proxy.onRequestResponse(JSON.parse(message));
    });
    return proxy.getProxy(message => client.send(JSON.stringify(message)));
  }

  exposeSevice(address: string, service: any) {
    const server = this._getServer(address);

    // todo - that's bullshit
    const wrapper = new ServiceWrapper(service, async response => {
      try {
        const { from } = response;
        await server.send(from, JSON.stringify(response));
        console.log("Response sent");
      } catch (error) {
        throw error;
      }
    });
    server.on("message", message => {
      const { from } = message;
      wrapper.onRequest({ ...JSON.parse(message.data), from });
    });
  }
}
