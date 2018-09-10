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
    this.ipfsRoom.broadcast({
      method: "bankrollerActive",
      params: [params],
      id: getId()
    });
  }
  sendResponse: (message: ResponseMessage) => void;
}

export class IpfsRoomProvider implements IRoomProvider {
  private sharedRoom: IPFSSharedRoom;
  ipfsNodePromise: Promise<Ipfs>;
  constructor() {
    this.ipfsNodePromise = createIpfsNode();
  }
  async getSharedRoom(
    gameId: string,
    onConnect: (data: any) => void
  ): Promise<ISharedRoom> {
    const ipfsNode = await this.ipfsNodePromise;
    if (!this.sharedRoom) return this.sharedRoom;
    const ipfsRoom = IpfsRoom(ipfsNode, gameId, {});
    this.sharedRoom = new IPFSSharedRoom(ipfsRoom, gameId, onConnect);
    return this.sharedRoom;
  }
  async getRoom<TRemoteInterface extends IRemoteInterface>(
    address: string,
    roomInfo: RoomInfo
  ): Promise<TRemoteInterface> {
    const ipfsNode = await this.ipfsNodePromise;
    const ipfsRoom = IpfsRoom(ipfsNode, address, {});
    const proxy = new RemoteProxy();
    ipfsRoom.on("message", proxy.onRequestResponse);
    return proxy.getProxy(ipfsRoom.broadcast);
  }
}
