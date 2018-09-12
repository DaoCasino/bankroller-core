import Ipfs from "ipfs";
import IpfsRoom from "ipfs-pubsub-room";
import {
  IRoomProvider,
  ISharedRoom,
  RoomInfo,
  RequestMessage,
  IRemoteInterface,
  ResponseMessage
} from "../dapps/Interfaces";
import { RemoteProxy, getId } from "../RemoteProxy";
import { createIpfsNode } from "./Ipfs";
import { ServiceWrapper } from "../ServiceWrapper";

export class IPFSSharedRoom implements ISharedRoom {
  onConnect: (dappId: string, callback: (data: any) => void) => void;
  gameId: string;
  ipfsRoom: any;
  constructor(
    ipfsRoom: any,
    gameId: string,
    onConnect: (dappId: string, callback: (data: any) => void) => void
  ) {
    this.onConnect = onConnect;
    this.ipfsRoom = ipfsRoom;
    this.gameId = gameId;

    ipfsRoom.on("message", message => {
      const { data } = message;
      if (!data || !data.action || data.action === "bankrollerActive") {
        return;
      }
      // User want to connect
      if (data.action === "connect" && data.slug === gameId) {
        onConnect(gameId, data);
      }
    });
  }
  bankrollerActive(params: {
    deposit: number;
    dapp: { slug: string; hash: string };
  }) {
    this.ipfsRoom.broadcast(
      JSON.stringify({
        method: "bankrollerActive",
        params: [params],
        id: getId()
      })
    );
  }
  sendResponse: (message: ResponseMessage) => void;
}

export class IpfsRoomProvider implements IRoomProvider {
  private sharedRoom: IPFSSharedRoom;
  private static _defaultIpfsNode: Ipfs;
  private static _ipfsNodePromise: Promise<Ipfs>;
  private _ipfsNode: Ipfs;
  private _roomsMap: Map<string, any>;
  peerId: string;
  private constructor(ipfsNode: Ipfs) {
    this._ipfsNode = ipfsNode;
    this.peerId = ipfsNode.id;
    this._roomsMap = new Map();
  }
  async waitForPeer(peerId: string, address: any, timeout: number = 10000) {
    return new Promise((resolve, reject) => {
      this._getIpfsRoom(address).once("peer joined", id => {
        if (peerId === id) {
          resolve();
        }
      });
      setTimeout(() => {
        reject();
      }, timeout);
    });
  }
  static async create(): Promise<IpfsRoomProvider> {
    if (!IpfsRoomProvider._defaultIpfsNode) {
      if (IpfsRoomProvider._ipfsNodePromise) {
        IpfsRoomProvider._defaultIpfsNode = await IpfsRoomProvider._ipfsNodePromise;
      } else {
        IpfsRoomProvider._ipfsNodePromise = createIpfsNode();
        IpfsRoomProvider._defaultIpfsNode = await IpfsRoomProvider._ipfsNodePromise;
        IpfsRoomProvider._ipfsNodePromise = null;
      }
    }
    return new IpfsRoomProvider(IpfsRoomProvider._defaultIpfsNode);
  }
  static async createAdditional(): Promise<IpfsRoomProvider> {
    const ipfsNode = await createIpfsNode();
    return new IpfsRoomProvider(ipfsNode);
  }
  private _getIpfsRoom(address: string): any {
    let room = this._roomsMap.get(address);
    if (!room) {
      room = IpfsRoom(this._ipfsNode, address, {})
        .on("error", error => {
          console.error(error);
        })
        .on("peer joined", id => {
          console.log(`peer joined ${id} to ${this._ipfsNode.id}`);
        });
      this._roomsMap.set(address, room);
    }
    return room;
  }
  getSharedRoom(gameId: string, onConnect: (data: any) => void): ISharedRoom {
    if (this.sharedRoom) return this.sharedRoom;
    const ipfsRoom = this._getIpfsRoom(gameId);
    this.sharedRoom = new IPFSSharedRoom(ipfsRoom, gameId, onConnect);
    return this.sharedRoom;
  }
  getRoom<TRemoteInterface>(
    address: string,
    roomInfo?: RoomInfo
  ): TRemoteInterface {
    const ipfsRoom = this._getIpfsRoom(address);

    const proxy = new RemoteProxy();
    const self = this;
    ipfsRoom.on("message", message => {
      if (message.from != self._ipfsNode.id)
        proxy.onRequestResponse(JSON.parse(message.data));
    });
    return proxy.getProxy(message =>
      ipfsRoom.broadcast(JSON.stringify(message))
    );
  }

  expose(address: string, service: any) {
    const ipfsRoom = this._getIpfsRoom(address);
    let peer;

    // todo - that's bullshit
    const wrapper = new ServiceWrapper(service, async response => {
      try {
        await ipfsRoom.sendTo(peer, JSON.stringify(response));
        console.log("Response sent");
      } catch (error) {
        throw error;
      }
    });
    ipfsRoom.on("message", message => {
      peer = message.from;
      wrapper.onRequest(JSON.parse(message.data));
    });
  }
}
