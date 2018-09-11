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

    ipfsRoom.on("message", data => {
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
  private static _ipfsNode: Ipfs;
  private static _ipfsNodePromise: Promise<Ipfs>;
  private constructor(ipfsNode: Ipfs) {}
  static async create(): Promise<IpfsRoomProvider> {
    if (!IpfsRoomProvider._ipfsNode) {
      if (IpfsRoomProvider._ipfsNodePromise) {
        IpfsRoomProvider._ipfsNode = await IpfsRoomProvider._ipfsNodePromise;
      } else {
        IpfsRoomProvider._ipfsNodePromise = createIpfsNode();
        IpfsRoomProvider._ipfsNode = await IpfsRoomProvider._ipfsNodePromise;
        IpfsRoomProvider._ipfsNodePromise = null;
      }
    }
    return new IpfsRoomProvider(IpfsRoomProvider._ipfsNode);
  }
  async getSharedRoom(
    gameId: string,
    onConnect: (data: any) => void
  ): Promise<ISharedRoom> {
    if (this.sharedRoom) return this.sharedRoom;
    const ipfsRoom = IpfsRoom(IpfsRoomProvider._ipfsNode, gameId, {});
    this.sharedRoom = new IPFSSharedRoom(ipfsRoom, gameId, onConnect);
    return this.sharedRoom;
  }
  async getRoom<TRemoteInterface extends IRemoteInterface>(
    address: string,
    roomInfo: RoomInfo
  ): Promise<TRemoteInterface> {
    const ipfsRoom = IpfsRoom(IpfsRoomProvider._ipfsNode, address, {});
    const proxy = new RemoteProxy();
    ipfsRoom.on("message", proxy.onRequestResponse);
    return proxy.getProxy(message =>
      ipfsRoom.broadcast(JSON.stringify(message))
    );
  }
}
